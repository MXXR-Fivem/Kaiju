use sqlx::{SqliteExecutor, SqlitePool};

use crate::domain::Stock;
use crate::errors::AppError;

const STOCK_SELECT: &str = "SELECT s.district_code, s.resource_code, r.name AS resource_name, s.initial_quantity,
    s.current_quantity, s.reserved_quantity, s.retention_pct
    FROM stocks s JOIN resource_types r ON r.code = s.resource_code";

pub async fn all(db: &SqlitePool) -> Result<Vec<Stock>, AppError> {
    let stocks: Vec<Stock> = sqlx::query_as(&format!("{STOCK_SELECT} ORDER BY s.district_code, s.resource_code"))
        .fetch_all(db)
        .await?;
    Ok(stocks.into_iter().map(Stock::with_limits).collect())
}

pub async fn find(db: &SqlitePool, district: &str, resource: &str) -> Result<Stock, AppError> {
    let stock: Option<Stock> = sqlx::query_as(&format!("{STOCK_SELECT} WHERE s.district_code = ? AND s.resource_code = ?"))
        .bind(district)
        .bind(resource)
        .fetch_optional(db)
        .await?;
    stock
        .map(Stock::with_limits)
        .ok_or_else(|| AppError::NotFound(format!("Ressource {resource} introuvable dans {district}.")))
}

pub async fn withdraw<'e>(db: impl SqliteExecutor<'e>, stock: &Stock, quantity: i64) -> Result<bool, AppError> {
    let result = sqlx::query(
        "UPDATE stocks SET current_quantity = current_quantity - ?1
         WHERE district_code = ?2 AND resource_code = ?3
         AND current_quantity - ?1 >= ?4 AND current_quantity - reserved_quantity >= ?1",
    )
    .bind(quantity)
    .bind(&stock.district_code)
    .bind(&stock.resource_code)
    .bind(stock.min_retained)
    .execute(db)
    .await?;
    Ok(result.rows_affected() == 1)
}

pub async fn deposit<'e>(db: impl SqliteExecutor<'e>, district: &str, resource: &str, quantity: i64) -> Result<(), AppError> {
    sqlx::query("UPDATE stocks SET current_quantity = current_quantity + ? WHERE district_code = ? AND resource_code = ?")
        .bind(quantity)
        .bind(district)
        .bind(resource)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn reserve<'e>(db: impl SqliteExecutor<'e>, district: &str, resource: &str, quantity: i64) -> Result<bool, AppError> {
    let result = sqlx::query(
        "UPDATE stocks SET reserved_quantity = reserved_quantity + ?1
         WHERE district_code = ?2 AND resource_code = ?3 AND current_quantity - reserved_quantity >= ?1",
    )
    .bind(quantity)
    .bind(district)
    .bind(resource)
    .execute(db)
    .await?;
    Ok(result.rows_affected() == 1)
}

pub async fn release<'e>(db: impl SqliteExecutor<'e>, district: &str, resource: &str, quantity: i64) -> Result<(), AppError> {
    sqlx::query("UPDATE stocks SET reserved_quantity = reserved_quantity - ? WHERE district_code = ? AND resource_code = ?")
        .bind(quantity)
        .bind(district)
        .bind(resource)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn set_retention(db: &SqlitePool, retention_pct: i64) -> Result<bool, AppError> {
    let result = sqlx::query("UPDATE stocks SET retention_pct = ?1 WHERE retention_pct <> ?1")
        .bind(retention_pct)
        .execute(db)
        .await?;
    Ok(result.rows_affected() > 0)
}
