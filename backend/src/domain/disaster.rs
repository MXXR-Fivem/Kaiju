use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum DisasterType {
    Earthquake,
    Tsunami,
    Tornado,
}

impl std::str::FromStr for DisasterType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_uppercase().as_str() {
            "EARTHQUAKE" => Ok(DisasterType::Earthquake),
            "TSUNAMI" => Ok(DisasterType::Tsunami),
            "TORNADO" => Ok(DisasterType::Tornado),
            _ => Err(format!("Type de désastre inconnu : {}", s)),
        }
    }
}

impl ToString for DisasterType {
    fn to_string(&self) -> String {
        match self {
            DisasterType::Earthquake => "EARTHQUAKE".to_string(),
            DisasterType::Tsunami => "TSUNAMI".to_string(),
            DisasterType::Tornado => "TORNADO".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DisasterEvent {
    pub id: String,
    pub district_id: String,
    pub disaster_type: String,
    pub intensity: i64,
    pub calculated_level: i64,
    pub is_active: bool,
    pub triggered_by: String,
    pub triggered_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
}
