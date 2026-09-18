use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{Pool, Sqlite};
use std::str::FromStr;

pub async fn init_db_pool(database_url: &str) -> Result<Pool<Sqlite>, sqlx::Error> {
    log::info!("Initialisation SQLite : {}", database_url);

    let connection_options = SqliteConnectOptions::from_str(database_url)?
        .create_if_missing(true)
        .foreign_keys(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(10)
        .connect_with(connection_options)
        .await?;

    let schema_sql = include_str!("../../migrations/20260917000001_init_schema.sql");
    sqlx::raw_sql(schema_sql).execute(&pool).await?;

    log::info!("Base de donnees SQLite operationnelle et schema Tokyork initialise.");
    Ok(pool)
}
