use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, sqlx::Type)]
#[serde(rename_all = "UPPERCASE")]
#[sqlx(rename_all = "UPPERCASE")]
pub enum ReservationStatus {
    Active,
    Returned,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Reservation {
    pub id: String,
    pub district_code: String,
    pub resource_code: String,
    pub resource_name: String,
    pub user_id: String,
    pub username: String,
    pub team_name: String,
    pub quantity: i64,
    pub starts_at: DateTime<Utc>,
    pub ends_at: DateTime<Utc>,
    pub status: ReservationStatus,
}

#[derive(Debug, Deserialize)]
pub struct NewReservation {
    pub resource: String,
    pub team_name: String,
    pub quantity: i64,
    pub starts_at: DateTime<Utc>,
    pub ends_at: DateTime<Utc>,
}
