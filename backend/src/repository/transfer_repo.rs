use sqlx::{SqliteExecutor, SqlitePool};

use crate::domain::{Transfer, TransferStatus};
use crate::errors::AppError;

const TRANSFER_SELECT: &str = "SELECT t.id, t.requester_id, u.username AS requester_name, t.source_code, t.target_code,
    t.transit_code, t.resource_code, r.name AS resource_name, t.quantity, t.route, t.is_requisition, t.source_approved,
    t.transit_approved, t.status, t.duration_minutes, t.created_at, t.departed_at, t.arrival_at, t.delivered_at
    FROM transfers t
    JOIN users u ON u.id = t.requester_id
    JOIN resource_types r ON r.code = t.resource_code";

pub async fn all(db: &SqlitePool) -> Result<Vec<Transfer>, AppError> {
    Ok(sqlx::query_as(&format!("{TRANSFER_SELECT} ORDER BY t.created_at DESC")).fetch_all(db).await?)
}

pub async fn find(db: &SqlitePool, id: &str) -> Result<Transfer, AppError> {
    sqlx::query_as(&format!("{TRANSFER_SELECT} WHERE t.id = ?"))
        .bind(id)
        .fetch_optional(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Transfert introuvable.".into()))
}

pub async fn pending_requests(db: &SqlitePool, source: &str, resource: &str) -> Result<Vec<String>, AppError> {
    Ok(sqlx::query_scalar(
        "SELECT u.username || ' → ' || t.target_code FROM transfers t JOIN users u ON u.id = t.requester_id
         WHERE t.status = 'PENDING' AND t.source_code = ? AND t.resource_code = ?",
    )
    .bind(source)
    .bind(resource)
    .fetch_all(db)
    .await?)
}

pub async fn has_pending_need(db: &SqlitePool, district: &str, resource: &str) -> Result<bool, AppError> {
    Ok(sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM transfers WHERE status = 'PENDING' AND target_code = ? AND resource_code = ?)",
    )
    .bind(district)
    .bind(resource)
    .fetch_one(db)
    .await?)
}

pub async fn insert<'e>(db: impl SqliteExecutor<'e>, t: &Transfer) -> Result<(), AppError> {
    sqlx::query(
        "INSERT INTO transfers (id, requester_id, source_code, target_code, transit_code, resource_code, quantity, route,
         is_requisition, source_approved, transit_approved, status, duration_minutes, created_at, departed_at, arrival_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&t.id)
    .bind(&t.requester_id)
    .bind(&t.source_code)
    .bind(&t.target_code)
    .bind(&t.transit_code)
    .bind(&t.resource_code)
    .bind(t.quantity)
    .bind(t.route)
    .bind(t.is_requisition)
    .bind(t.source_approved)
    .bind(t.transit_approved)
    .bind(t.status)
    .bind(t.duration_minutes)
    .bind(t.created_at)
    .bind(t.departed_at)
    .bind(t.arrival_at)
    .execute(db)
    .await?;
    Ok(())
}

pub async fn update<'e>(db: impl SqliteExecutor<'e>, t: &Transfer, expected: TransferStatus) -> Result<bool, AppError> {
    let result = sqlx::query(
        "UPDATE transfers SET source_approved = ?, transit_approved = ?, status = ?, departed_at = ?, arrival_at = ?,
         delivered_at = ? WHERE id = ? AND status = ?",
    )
    .bind(t.source_approved)
    .bind(t.transit_approved)
    .bind(t.status)
    .bind(t.departed_at)
    .bind(t.arrival_at)
    .bind(t.delivered_at)
    .bind(&t.id)
    .bind(expected)
    .execute(db)
    .await?;
    Ok(result.rows_affected() == 1)
}
