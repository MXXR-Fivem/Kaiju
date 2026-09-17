use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum TransferStatus {
    Pending,
    Approved,
    InTransit,
    Delivered,
    Rejected,
    Cancelled,
}

impl ToString for TransferStatus {
    fn to_string(&self) -> String {
        match self {
            TransferStatus::Pending => "PENDING".to_string(),
            TransferStatus::Approved => "APPROVED".to_string(),
            TransferStatus::InTransit => "IN_TRANSIT".to_string(),
            TransferStatus::Delivered => "DELIVERED".to_string(),
            TransferStatus::Rejected => "REJECTED".to_string(),
            TransferStatus::Cancelled => "CANCELLED".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum TransitApprovalStatus {
    None,
    Pending,
    Approved,
    Rejected,
}

impl ToString for TransitApprovalStatus {
    fn to_string(&self) -> String {
        match self {
            TransitApprovalStatus::None => "NONE".to_string(),
            TransitApprovalStatus::Pending => "PENDING".to_string(),
            TransitApprovalStatus::Approved => "APPROVED".to_string(),
            TransitApprovalStatus::Rejected => "REJECTED".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TransferRequest {
    pub id: String,
    pub requester_id: String,
    pub source_district_id: String,
    pub target_district_id: String,
    pub resource_type_id: String,
    pub quantity: i64,
    pub route_type: String,
    pub transit_district_id: Option<String>,
    pub status: String,
    pub transit_approval_status: String,
    pub estimated_duration_minutes: i64,
    pub departed_at: Option<DateTime<Utc>>,
    pub estimated_arrival_at: Option<DateTime<Utc>>,
    pub delivered_at: Option<DateTime<Utc>>,
    pub rejection_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TransferRequestDetail {
    pub id: String,
    pub requester_id: String,
    pub requester_name: String,
    pub requester_role: String,
    pub source_district_id: String,
    pub source_district_code: String,
    pub source_district_name: String,
    pub target_district_id: String,
    pub target_district_code: String,
    pub target_district_name: String,
    pub resource_type_id: String,
    pub resource_code: String,
    pub resource_name: String,
    pub unit: String,
    pub quantity: i64,
    pub route_type: String,
    pub transit_district_id: Option<String>,
    pub transit_district_code: Option<String>,
    pub status: String,
    pub transit_approval_status: String,
    pub estimated_duration_minutes: i64,
    pub departed_at: Option<DateTime<Utc>>,
    pub estimated_arrival_at: Option<DateTime<Utc>>,
    pub delivered_at: Option<DateTime<Utc>>,
    pub rejection_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
