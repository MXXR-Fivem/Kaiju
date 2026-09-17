use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ResourceType {
    pub id: String,
    pub code: String,
    pub name: String,
    pub description: String,
    pub unit: String,
    pub is_critical: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DistrictResource {
    pub id: String,
    pub district_id: String,
    pub resource_type_id: String,
    pub initial_quantity: i64,
    pub current_quantity: i64,
    pub reserved_quantity: i64,
    pub min_retention_pct: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DistrictResourceDetail {
    pub id: String,
    pub district_id: String,
    pub district_code: String,
    pub district_name: String,
    pub resource_type_id: String,
    pub resource_code: String,
    pub resource_name: String,
    pub unit: String,
    pub initial_quantity: i64,
    pub current_quantity: i64,
    pub reserved_quantity: i64,
    pub available_quantity: i64,
    pub min_retention_pct: f64,
    pub min_retained_quantity: i64,
    pub transferable_quantity: i64,
}
