use sqlx::{Pool, Sqlite};
use crate::domain::{DistrictResource, DistrictResourceDetail, ResourceType, ResourceReservation};
use crate::errors::AppError;

pub struct ResourceRepository {
    pool: Pool<Sqlite>,
}

impl ResourceRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub async fn find_all_types(&self) -> Result<Vec<ResourceType>, AppError> {
        let types = sqlx::query_as::<_, ResourceType>(
            r#"
            SELECT id, code, name, description, unit, is_critical
            FROM resource_types
            ORDER BY code ASC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(types)
    }

    pub async fn find_type_by_code(&self, code: &str) -> Result<Option<ResourceType>, AppError> {
        let res_type = sqlx::query_as::<_, ResourceType>(
            r#"
            SELECT id, code, name, description, unit, is_critical
            FROM resource_types
            WHERE code = $1
            "#
        )
        .bind(code)
        .fetch_optional(&self.pool)
        .await?;

        Ok(res_type)
    }

    pub async fn find_district_resources_detailed(&self, district_id: Option<&str>) -> Result<Vec<DistrictResourceDetail>, AppError> {
        let query_str = format!(
            r#"
            SELECT 
                dr.id,
                d.id as district_id,
                d.code as district_code,
                d.name as district_name,
                rt.id as resource_type_id,
                rt.code as resource_code,
                rt.name as resource_name,
                rt.unit,
                dr.initial_quantity,
                dr.current_quantity,
                dr.reserved_quantity,
                (dr.current_quantity - dr.reserved_quantity) as available_quantity,
                dr.min_retention_pct,
                CAST(CEIL(dr.initial_quantity * dr.min_retention_pct) AS INTEGER) as min_retained_quantity,
                MAX(0, (dr.current_quantity - dr.reserved_quantity) - CAST(CEIL(dr.initial_quantity * dr.min_retention_pct) AS INTEGER)) as transferable_quantity
            FROM district_resources dr
            JOIN districts d ON dr.district_id = d.id
            JOIN resource_types rt ON dr.resource_type_id = rt.id
            {}
            ORDER BY d.code ASC, rt.code ASC
            "#,
            if district_id.is_some() { "WHERE dr.district_id = $1" } else { "" }
        );

        let rows = if let Some(did) = district_id {
            sqlx::query_as::<_, DistrictResourceDetail>(&query_str)
                .bind(did)
                .fetch_all(&self.pool)
                .await?
        } else {
            sqlx::query_as::<_, DistrictResourceDetail>(&query_str)
                .fetch_all(&self.pool)
                .await?
        };

        Ok(rows)
    }

    pub async fn find_district_resource(
        &self,
        district_id: &str,
        resource_type_id: &str,
    ) -> Result<Option<DistrictResource>, AppError> {
        let res = sqlx::query_as::<_, DistrictResource>(
            r#"
            SELECT id, district_id, resource_type_id, initial_quantity, current_quantity, reserved_quantity, min_retention_pct
            FROM district_resources
            WHERE district_id = $1 AND resource_type_id = $2
            "#
        )
        .bind(district_id)
        .bind(resource_type_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(res)
    }

    pub async fn deduct_resource(
        &self,
        district_id: &str,
        resource_type_id: &str,
        quantity: i64,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE district_resources
            SET current_quantity = current_quantity - $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE district_id = $2 AND resource_type_id = $3
            "#
        )
        .bind(quantity)
        .bind(district_id)
        .bind(resource_type_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn add_resource(
        &self,
        district_id: &str,
        resource_type_id: &str,
        quantity: i64,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE district_resources
            SET current_quantity = current_quantity + $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE district_id = $2 AND resource_type_id = $3
            "#
        )
        .bind(quantity)
        .bind(district_id)
        .bind(resource_type_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn create_reservation(
        &self,
        id: &str,
        district_id: &str,
        resource_type_id: &str,
        user_id: &str,
        team_name: &str,
        quantity: i64,
    ) -> Result<(), AppError> {
        // En transaction : vérifie et augmente reserved_quantity
        let mut tx = self.pool.begin().await?;

        sqlx::query(
            r#"
            UPDATE district_resources
            SET reserved_quantity = reserved_quantity + $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE district_id = $2 AND resource_type_id = $3
            "#
        )
        .bind(quantity)
        .bind(district_id)
        .bind(resource_type_id)
        .execute(&mut *tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO resource_reservations (id, district_id, resource_type_id, user_id, team_name, quantity, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
            "#
        )
        .bind(id)
        .bind(district_id)
        .bind(resource_type_id)
        .bind(user_id)
        .bind(team_name)
        .bind(quantity)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(())
    }

    pub async fn release_reservation(&self, reservation_id: &str) -> Result<(), AppError> {
        let mut tx = self.pool.begin().await?;

        let res = sqlx::query_as::<_, ResourceReservation>(
            r#"
            SELECT id, district_id, resource_type_id, user_id, team_name, quantity, status, expires_at, created_at
            FROM resource_reservations
            WHERE id = $1 AND status = 'ACTIVE'
            "#
        )
        .bind(reservation_id)
        .fetch_optional(&mut *tx)
        .await?;

        if let Some(reservation) = res {
            sqlx::query(
                r#"
                UPDATE district_resources
                SET reserved_quantity = MAX(0, reserved_quantity - $1),
                    updated_at = CURRENT_TIMESTAMP
                WHERE district_id = $2 AND resource_type_id = $3
                "#
            )
            .bind(reservation.quantity)
            .bind(&reservation.district_id)
            .bind(&reservation.resource_type_id)
            .execute(&mut *tx)
            .await?;

            sqlx::query(
                r#"
                UPDATE resource_reservations
                SET status = 'RELEASED'
                WHERE id = $1
                "#
            )
            .bind(reservation_id)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        Ok(())
    }

    pub async fn update_retention_override(&self, district_id: &str, new_pct: f64) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE district_resources
            SET min_retention_pct = $1, updated_at = CURRENT_TIMESTAMP
            WHERE district_id = $2
            "#
        )
        .bind(new_pct)
        .bind(district_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
