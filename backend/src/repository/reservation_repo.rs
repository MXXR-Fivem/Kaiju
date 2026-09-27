use chrono::Utc;
use sqlx::{SqliteExecutor, SqlitePool};

use crate::domain::{NewReservation, Reservation};
use crate::errors::AppError;

const RESERVATION_SELECT: &str = "SELECT v.id, v.district_code, v.resource_code, r.name AS resource_name, v.user_id,
    u.username, v.team_name, v.quantity, v.starts_at, v.ends_at, v.status
    FROM reservations v
    JOIN resource_types r ON r.code = v.resource_code
    JOIN users u ON u.id = v.user_id";

pub async fn all(db: &SqlitePool) -> Result<Vec<Reservation>, AppError> {
    Ok(sqlx::query_as(&format!("{RESERVATION_SELECT} ORDER BY v.starts_at")).fetch_all(db).await?)
}

pub async fn find(db: &SqlitePool, id: &str) -> Result<Reservation, AppError> {
    sqlx::query_as(&format!("{RESERVATION_SELECT} WHERE v.id = ?"))
        .bind(id)
        .fetch_optional(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Réservation introuvable.".into()))
}

pub async fn active_teams(db: &SqlitePool, district: &str, resource: &str) -> Result<Vec<String>, AppError> {
    Ok(sqlx::query_scalar(
        "SELECT DISTINCT team_name FROM reservations WHERE status = 'ACTIVE' AND district_code = ? AND resource_code = ?",
    )
    .bind(district)
    .bind(resource)
    .fetch_all(db)
    .await?)
}

pub async fn insert<'e>(
    db: impl SqliteExecutor<'e>,
    id: &str,
    district: &str,
    user_id: &str,
    reservation: &NewReservation,
) -> Result<(), AppError> {
    sqlx::query(
        "INSERT INTO reservations (id, district_code, resource_code, user_id, team_name, quantity, starts_at, ends_at, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)",
    )
    .bind(id)
    .bind(district)
    .bind(&reservation.resource)
    .bind(user_id)
    .bind(reservation.team_name.trim())
    .bind(reservation.quantity)
    .bind(reservation.starts_at)
    .bind(reservation.ends_at)
    .bind(Utc::now())
    .execute(db)
    .await?;
    Ok(())
}

pub async fn mark_returned<'e>(db: impl SqliteExecutor<'e>, id: &str) -> Result<bool, AppError> {
    let result = sqlx::query("UPDATE reservations SET status = 'RETURNED' WHERE id = ? AND status = 'ACTIVE'")
        .bind(id)
        .execute(db)
        .await?;
    Ok(result.rows_affected() == 1)
}
