use sqlx::{SqliteExecutor, SqlitePool};

use crate::domain::{rules::Topology, District};
use crate::errors::AppError;

const DISTRICT_SELECT: &str = "SELECT code, name, is_coastal, latitude, longitude, disaster_level FROM districts";

pub async fn all(db: &SqlitePool) -> Result<Vec<District>, AppError> {
    Ok(sqlx::query_as(&format!("{DISTRICT_SELECT} ORDER BY code")).fetch_all(db).await?)
}

pub async fn find(db: &SqlitePool, code: &str) -> Result<District, AppError> {
    sqlx::query_as(&format!("{DISTRICT_SELECT} WHERE code = ?"))
        .bind(code)
        .fetch_optional(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Quartier {code} introuvable.")))
}

pub async fn city_level(db: &SqlitePool) -> Result<i64, AppError> {
    Ok(sqlx::query_scalar("SELECT COALESCE(MAX(disaster_level), 1) FROM districts").fetch_one(db).await?)
}

pub async fn set_level<'e>(db: impl SqliteExecutor<'e>, code: &str, level: i64) -> Result<(), AppError> {
    sqlx::query("UPDATE districts SET disaster_level = ? WHERE code = ?")
        .bind(level)
        .bind(code)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn topology(db: &SqlitePool) -> Result<Topology, AppError> {
    let adjacencies = sqlx::query_as("SELECT district_code, neighbor_code FROM adjacencies").fetch_all(db).await?;
    let coastal = sqlx::query_scalar("SELECT code FROM districts WHERE is_coastal").fetch_all(db).await?;
    Ok(Topology::new(adjacencies, coastal))
}
