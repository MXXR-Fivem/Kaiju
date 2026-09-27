use serde::Serialize;
use sqlx::FromRow;

use super::rules;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Stock {
    pub district_code: String,
    pub resource_code: String,
    pub resource_name: String,
    pub initial_quantity: i64,
    pub current_quantity: i64,
    pub reserved_quantity: i64,
    pub retention_pct: i64,
    #[sqlx(default)]
    pub min_retained: i64,
    #[sqlx(default)]
    pub available: i64,
    #[sqlx(default)]
    pub transferable: i64,
}

impl Stock {
    pub fn with_limits(mut self) -> Self {
        self.min_retained = rules::min_retained(self.initial_quantity, self.retention_pct);
        self.available = self.current_quantity - self.reserved_quantity;
        self.transferable = self.available.min(self.current_quantity - self.min_retained).max(0);
        self
    }
}
