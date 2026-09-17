use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ResourceReservation {
    pub id: String,
    pub district_id: String,
    pub resource_type_id: String,
    pub user_id: String,
    pub team_name: String,
    pub quantity: i64,
    pub status: String,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}
