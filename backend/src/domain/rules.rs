use crate::errors::AppError;

pub struct RulesEngine;

impl RulesEngine {
    pub fn calculate_min_retention(initial_quantity: i64, min_retention_pct: f64) -> i64 {
        ((initial_quantity as f64) * min_retention_pct).ceil() as i64
    }

    pub fn validate_retention(
        district_code: &str,
        resource_code: &str,
        initial_quantity: i64,
        current_quantity: i64,
        requested_quantity: i64,
        min_retention_pct: f64,
    ) -> Result<(), AppError> {
        let min_required = Self::calculate_min_retention(initial_quantity, min_retention_pct);
        let remaining = current_quantity - requested_quantity;

        if remaining < min_required {
            return Err(AppError::RetentionViolation {
                message: format!(
                    "Le quartier {} ne peut transferer {} unites de {}. Le stock residuel ({}) passerait sous le seuil legal de retention de {:.0}% (minimum requis : {} sur un stock initial de {}).",
                    district_code,
                    requested_quantity,
                    resource_code,
                    remaining,
                    min_retention_pct * 100.0,
                    min_required,
                    initial_quantity
                ),
                current_quantity,
                requested_quantity,
                min_required_retention: min_required,
                retention_percentage: min_retention_pct,
            });
        }

        Ok(())
    }

    pub fn validate_retention_override(role: &str, disaster_level: i64) -> Result<f64, AppError> {
        if role != "CD" {
            return Err(AppError::InsufficientPermissions {
                required_role: "CD".to_string(),
                current_role: role.to_string(),
                message: "Seul le Directeur de Crise (City Director) peut abaisser le seuil de retention d'urgence.".to_string(),
            });
        }

        if disaster_level < 5 {
            return Err(AppError::DisasterLevelRestricted {
                required_level: 5,
                current_level: disaster_level,
                message: "L'abaissement du seuil de retention a 15% est strictement reserve au Niveau de Crise 5.".to_string(),
            });
        }

        Ok(0.15)
    }

    pub fn validate_disaster_target(
        district_code: &str,
        is_coastal: bool,
        disaster_type: &str,
    ) -> Result<(), AppError> {
        if disaster_type.eq_ignore_ascii_case("TSUNAMI") && !is_coastal {
            return Err(AppError::InvalidDisasterTarget {
                district_code: district_code.to_string(),
                disaster_type: "TSUNAMI".to_string(),
                message: format!(
                    "Catastrophe incompatible : Le quartier enclave '{}' ne possede aucun acces maritime. Tsunami impossible.",
                    district_code
                ),
            });
        }

        Ok(())
    }

    pub fn validate_disaster_level_for_transfer(
        disaster_level: i64,
        is_direct_adjacent: bool,
        role: &str,
    ) -> Result<(), AppError> {
        if disaster_level < 3 {
            return Err(AppError::DisasterLevelRestricted {
                required_level: 3,
                current_level: disaster_level,
                message: "Les transferts de ressources inter-quartiers sont verrouilles en dessous du Niveau de Crise 3.".to_string(),
            });
        }

        if !is_direct_adjacent && disaster_level < 4 {
            return Err(AppError::DisasterLevelRestricted {
                required_level: 4,
                current_level: disaster_level,
                message: "Les transferts non-adjacents necessitant un transit sont verrouilles en dessous du Niveau de Crise 4.".to_string(),
            });
        }

        if !is_direct_adjacent && role == "QC" && disaster_level < 5 {
            return Err(AppError::InsufficientPermissions {
                required_role: "LC ou CD".to_string(),
                current_role: role.to_string(),
                message: "Un coordonnateur de quartier (QC) ne peut initier que des transferts avec ses voisins directs. Transfert etendu reserve au LC ou CD.".to_string(),
            });
        }

        Ok(())
    }

    pub fn calculate_transit_duration(base_transit_minutes: i64, route_type: &str) -> i64 {
        if route_type.eq_ignore_ascii_case("SEA") {
            base_transit_minutes * 2
        } else {
            base_transit_minutes
        }
    }

    pub fn validate_xeno_transit_allowance(
        xeno_disaster_level: i64,
        xeno_resource_deficit: bool,
    ) -> Result<(), AppError> {
        if xeno_disaster_level >= 4 && xeno_resource_deficit {
            return Err(AppError::TransitDeniedByXeno {
                message: "Xeno Hub est en crise majeure et priorise ses propres besoins vitaux. Transit temporairement interrompu.".to_string(),
            });
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_retention_calculation_and_validation() {
        let min_ret = RulesEngine::calculate_min_retention(1000, 0.30);
        assert_eq!(min_ret, 300);

        assert!(RulesEngine::validate_retention("X", "WATER", 1000, 1000, 600, 0.30).is_ok());

        let err = RulesEngine::validate_retention("X", "WATER", 1000, 1000, 750, 0.30);
        assert!(err.is_err());
    }

    #[test]
    fn test_retention_override_cd_level5() {
        assert!(RulesEngine::validate_retention_override("QC", 5).is_err());
        assert!(RulesEngine::validate_retention_override("CD", 4).is_err());

        let pct = RulesEngine::validate_retention_override("CD", 5).unwrap();
        assert_eq!(pct, 0.15);
    }

    #[test]
    fn test_disaster_target_validation() {
        assert!(RulesEngine::validate_disaster_target("A", false, "TSUNAMI").is_err());
        assert!(RulesEngine::validate_disaster_target("W", false, "TSUNAMI").is_err());

        assert!(RulesEngine::validate_disaster_target("E", true, "TSUNAMI").is_ok());
        assert!(RulesEngine::validate_disaster_target("X", true, "TSUNAMI").is_ok());
        assert!(RulesEngine::validate_disaster_target("Z", true, "TSUNAMI").is_ok());

        assert!(RulesEngine::validate_disaster_target("A", false, "EARTHQUAKE").is_ok());
        assert!(RulesEngine::validate_disaster_target("W", false, "TORNADO").is_ok());
    }

    #[test]
    fn test_maritime_transit_duration_doubling() {
        let land_time = RulesEngine::calculate_transit_duration(30, "LAND");
        assert_eq!(land_time, 30);

        let sea_time = RulesEngine::calculate_transit_duration(30, "SEA");
        assert_eq!(sea_time, 60);
    }
}
