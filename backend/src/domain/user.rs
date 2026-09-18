use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum UserRole {
    QC, // Quarter Coordinator
    LC, // Logistics Coordinator
    CD, // City Director
}

impl std::str::FromStr for UserRole {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_uppercase().as_str() {
            "QC" => Ok(UserRole::QC),
            "LC" => Ok(UserRole::LC),
            "CD" => Ok(UserRole::CD),
            _ => Err(format!("Rôle non reconnu : {}", s)),
        }
    }
}

impl ToString for UserRole {
    fn to_string(&self) -> String {
        match self {
            UserRole::QC => "QC".to_string(),
            UserRole::LC => "LC".to_string(),
            UserRole::CD => "CD".to_string(),
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserAccount {
    pub id: String,
    pub username: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub display_name: String,
    pub role: String,
    pub assigned_district_id: Option<String>,
}
