use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::str::FromStr;

pub async fn init_db_pool(database_url: &str) -> Result<SqlitePool, sqlx::Error> {
    let options = SqliteConnectOptions::from_str(database_url)?
        .create_if_missing(true)
        .foreign_keys(true);
    let pool = SqlitePoolOptions::new().max_connections(10).connect_with(options).await?;
    sqlx::raw_sql(include_str!("../../migrations/20260917000001_init_schema.sql"))
        .execute(&pool)
        .await?;
    Ok(pool)
}
