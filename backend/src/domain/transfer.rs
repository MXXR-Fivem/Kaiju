use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "UPPERCASE")]
#[sqlx(rename_all = "UPPERCASE")]
pub enum Route {
    Land,
    Sea,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, sqlx::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TransferStatus {
    Pending,
    InTransit,
    Delivered,
    Rejected,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Transfer {
    pub id: String,
    pub requester_id: String,
    pub requester_name: String,
    pub source_code: String,
    pub target_code: String,
    pub transit_code: Option<String>,
    pub resource_code: String,
    pub resource_name: String,
    pub quantity: i64,
    pub route: Route,
    pub is_requisition: bool,
    pub source_approved: bool,
    pub transit_approved: Option<bool>,
    pub status: TransferStatus,
    pub duration_minutes: i64,
    pub created_at: DateTime<Utc>,
    pub departed_at: Option<DateTime<Utc>>,
    pub arrival_at: Option<DateTime<Utc>>,
    pub delivered_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct NewTransfer {
    pub source: String,
    pub target: String,
    pub resource: String,
    pub quantity: i64,
    pub route: Option<Route>,
    #[serde(default)]
    pub requisition: bool,
}
