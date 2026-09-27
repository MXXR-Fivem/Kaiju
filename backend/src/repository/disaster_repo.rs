use chrono::{DateTime, Utc};
use sqlx::{SqliteExecutor, SqlitePool};

use crate::domain::Disaster;
use crate::errors::AppError;

pub async fn active(db: &SqlitePool) -> Result<Vec<Disaster>, AppError> {
    Ok(sqlx::query_as(
        "SELECT id, district_code, disaster_type, level, active, triggered_at, resolved_at
         FROM disasters WHERE active ORDER BY triggered_at DESC",
    )
    .fetch_all(db)
    .await?)
}

pub async fn insert<'e>(db: impl SqliteExecutor<'e>, disaster: &Disaster) -> Result<(), AppError> {
    sqlx::query(
        "INSERT INTO disasters (id, district_code, disaster_type, level, active, triggered_at)
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&disaster.id)
    .bind(&disaster.district_code)
    .bind(disaster.disaster_type)
    .bind(disaster.level)
    .bind(disaster.active)
    .bind(disaster.triggered_at)
    .execute(db)
    .await?;
    Ok(())
}

pub async fn resolve<'e>(db: impl SqliteExecutor<'e>, district: &str, at: DateTime<Utc>) -> Result<(), AppError> {
    sqlx::query("UPDATE disasters SET active = 0, resolved_at = ? WHERE district_code = ? AND active")
        .bind(at)
        .bind(district)
        .execute(db)
        .await?;
    Ok(())
}
