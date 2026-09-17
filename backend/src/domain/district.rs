use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RouteType {
    Land,
    Sea,
}

impl ToString for RouteType {
    fn to_string(&self) -> String {
        match self {
            RouteType::Land => "LAND".to_string(),
            RouteType::Sea => "SEA".to_string(),
        }
    }
}

impl std::str::FromStr for RouteType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_uppercase().as_str() {
            "LAND" => Ok(RouteType::Land),
            "SEA" => Ok(RouteType::Sea),
            _ => Err(format!("Type de route inconnu : {}", s)),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct District {
    pub id: String,
    pub code: String,
    pub name: String,
    pub is_coastal: bool,
    pub latitude: f64,
    pub longitude: f64,
    pub polygon_bounds_json: String,
    pub current_disaster_level: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DistrictAdjacency {
    pub id: String,
    pub from_district_id: String,
    pub to_district_id: String,
    pub route_type: String,
    pub base_transit_minutes: i64,
    pub is_blocked: bool,
}
