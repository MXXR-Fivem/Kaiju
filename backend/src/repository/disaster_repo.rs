use sqlx::{Pool, Sqlite};
use crate::domain::DisasterEvent;
use crate::errors::AppError;

pub struct DisasterRepository {
    pool: Pool<Sqlite>,
}

impl DisasterRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub async fn find_active(&self) -> Result<Option<DisasterEvent>, AppError> {
        let disaster = sqlx::query_as::<_, DisasterEvent>(
            r#"
            SELECT id, district_id, disaster_type, intensity, calculated_level, is_active, triggered_by, triggered_at, resolved_at
            FROM disaster_events
            WHERE is_active = 1
            ORDER BY triggered_at DESC
            LIMIT 1
            "#
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(disaster)
    }

    #[allow(dead_code)]
    pub async fn find_all_history(&self) -> Result<Vec<DisasterEvent>, AppError> {
        let list = sqlx::query_as::<_, DisasterEvent>(
            r#"
            SELECT id, district_id, disaster_type, intensity, calculated_level, is_active, triggered_by, triggered_at, resolved_at
            FROM disaster_events
            ORDER BY triggered_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(list)
    }

    pub async fn create_disaster(
        &self,
        id: &str,
        district_id: &str,
        disaster_type: &str,
        intensity: i64,
        calculated_level: i64,
        triggered_by: &str,
    ) -> Result<DisasterEvent, AppError> {
        let mut tx = self.pool.begin().await?;

        sqlx::query(
            r#"
            UPDATE disaster_events
            SET is_active = 0, resolved_at = CURRENT_TIMESTAMP
            WHERE is_active = 1
            "#
        )
        .execute(&mut *tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO disaster_events (id, district_id, disaster_type, intensity, calculated_level, is_active, triggered_by)
            VALUES ($1, $2, $3, $4, $5, 1, $6)
            "#
        )
        .bind(id)
        .bind(district_id)
        .bind(disaster_type)
        .bind(intensity)
        .bind(calculated_level)
        .bind(triggered_by)
        .execute(&mut *tx)
        .await?;

        sqlx::query(
            r#"
            UPDATE districts
            SET current_disaster_level = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            "#
        )
        .bind(calculated_level)
        .bind(district_id)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        let created = self.find_active().await?.ok_or_else(|| {
            AppError::InternalError("Impossible de relire le desastre cree.".to_string())
        })?;

        Ok(created)
    }

    pub async fn resolve_active_disaster(&self) -> Result<Option<DisasterEvent>, AppError> {
        let active = self.find_active().await?;
        if let Some(mut d) = active {
            let mut tx = self.pool.begin().await?;

            sqlx::query(
                r#"
                UPDATE disaster_events
                SET is_active = 0, resolved_at = CURRENT_TIMESTAMP
                WHERE id = $1
                "#
            )
            .bind(&d.id)
            .execute(&mut *tx)
            .await?;

            sqlx::query(
                r#"
                UPDATE districts
                SET current_disaster_level = 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                "#
            )
            .bind(&d.district_id)
            .execute(&mut *tx)
            .await?;

            tx.commit().await?;

            d.is_active = false;
            return Ok(Some(d));
        }

        Ok(None)
    }
}
