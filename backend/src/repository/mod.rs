pub mod disaster_repo;
pub mod district_repo;
pub mod reservation_repo;
pub mod resource_repo;
pub mod transfer_repo;
pub mod user_repo;

use sqlx::SqlitePool;

use crate::errors::AppError;

pub async fn reset(db: &SqlitePool) -> Result<(), AppError> {
    sqlx::raw_sql(
        "BEGIN;
         DELETE FROM transfers;
         DELETE FROM reservations;
         DELETE FROM disasters;
         UPDATE stocks SET current_quantity = initial_quantity, reserved_quantity = 0, retention_pct = 30;
         UPDATE districts SET disaster_level = 1;
         COMMIT;",
    )
    .execute(db)
    .await?;
    Ok(())
}
