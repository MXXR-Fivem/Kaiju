use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct District {
    pub code: String,
    pub name: String,
    pub is_coastal: bool,
    pub latitude: f64,
    pub longitude: f64,
    pub disaster_level: i64,
}
