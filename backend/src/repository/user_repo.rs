use chrono::Utc;
use sqlx::SqlitePool;

use crate::domain::User;
use crate::errors::AppError;

pub async fn find_by_username(db: &SqlitePool, username: &str) -> Result<Option<User>, AppError> {
    Ok(sqlx::query_as("SELECT id, username, password_hash, role, district_code FROM users WHERE username = ?")
        .bind(username)
        .fetch_optional(db)
        .await?)
}

pub async fn insert(db: &SqlitePool, user: &User) -> Result<(), AppError> {
    sqlx::query(
        "INSERT INTO users (id, username, password_hash, role, district_code, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&user.id)
    .bind(&user.username)
    .bind(&user.password_hash)
    .bind(user.role)
    .bind(&user.district_code)
    .bind(Utc::now())
    .execute(db)
    .await?;
    Ok(())
}
