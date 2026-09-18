use sqlx::{Pool, Sqlite};
use crate::domain::{District, DistrictAdjacency};
use crate::errors::AppError;

pub struct DistrictRepository {
    pool: Pool<Sqlite>,
}

impl DistrictRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub async fn find_all(&self) -> Result<Vec<District>, AppError> {
        let districts = sqlx::query_as::<_, District>(
            r#"
            SELECT id, code, name, is_coastal, latitude, longitude, polygon_bounds_json, current_disaster_level
            FROM districts
            ORDER BY code ASC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(districts)
    }

    pub async fn find_by_id(&self, id: &str) -> Result<Option<District>, AppError> {
        let district = sqlx::query_as::<_, District>(
            r#"
            SELECT id, code, name, is_coastal, latitude, longitude, polygon_bounds_json, current_disaster_level
            FROM districts
            WHERE id = $1
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(district)
    }

    pub async fn find_by_code(&self, code: &str) -> Result<Option<District>, AppError> {
        let district = sqlx::query_as::<_, District>(
            r#"
            SELECT id, code, name, is_coastal, latitude, longitude, polygon_bounds_json, current_disaster_level
            FROM districts
            WHERE code = $1
            "#
        )
        .bind(code)
        .fetch_optional(&self.pool)
        .await?;

        Ok(district)
    }

    #[allow(dead_code)]
    pub async fn update_disaster_level(&self, district_id: &str, level: i64) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE districts
            SET current_disaster_level = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            "#
        )
        .bind(level)
        .bind(district_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn find_adjacencies(&self, from_id: &str) -> Result<Vec<DistrictAdjacency>, AppError> {
        let adjacencies = sqlx::query_as::<_, DistrictAdjacency>(
            r#"
            SELECT id, from_district_id, to_district_id, route_type, base_transit_minutes, is_blocked
            FROM district_adjacencies
            WHERE from_district_id = $1 AND is_blocked = 0
            "#
        )
        .bind(from_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(adjacencies)
    }

    pub async fn find_adjacency_between(
        &self,
        from_id: &str,
        to_id: &str,
        route_type: &str,
    ) -> Result<Option<DistrictAdjacency>, AppError> {
        let adjacency = sqlx::query_as::<_, DistrictAdjacency>(
            r#"
            SELECT id, from_district_id, to_district_id, route_type, base_transit_minutes, is_blocked
            FROM district_adjacencies
            WHERE from_district_id = $1 AND to_district_id = $2 AND route_type = $3
            "#
        )
        .bind(from_id)
        .bind(to_id)
        .bind(route_type)
        .fetch_optional(&self.pool)
        .await?;

        Ok(adjacency)
    }
}
