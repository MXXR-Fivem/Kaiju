use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "UPPERCASE")]
#[sqlx(rename_all = "UPPERCASE")]
pub enum DisasterType {
    Earthquake,
    Tsunami,
    Tornado,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Disaster {
    pub id: String,
    pub district_code: String,
    pub disaster_type: DisasterType,
    pub level: i64,
    pub active: bool,
    pub triggered_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
}
