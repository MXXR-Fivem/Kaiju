use crate::errors::AppError;

pub struct RulesEngine;

impl RulesEngine {
    /// Règle de rétention :
    /// Calcule la quantité minimale que le quartier DOIT conserver.
    /// min_retention_pct = 0.30 par défaut, ou 0.15 si dérogation CD en Niveau 5.
    pub fn calculate_min_retention(initial_quantity: i64, min_retention_pct: f64) -> i64 {
        ((initial_quantity as f64) * min_retention_pct).ceil() as i64
    }

    /// Valide si un prélèvement respecte la règle de rétention.
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
                    "Le quartier {} ne peut transférer {} unités de {}. Le stock résiduel ({}) passerait sous le seuil légal de rétention de {:.0}% (minimum requis : {} sur un stock initial de {}).",
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

    /// Valide si le rôle a le droit de réduire le seuil de rétention à 15%.
    /// Condition stricte : Rôle CD ET Disaster Level == 5.
    pub fn validate_retention_override(role: &str, disaster_level: i64) -> Result<f64, AppError> {
        if role != "CD" {
            return Err(AppError::InsufficientPermissions {
                required_role: "CD".to_string(),
                current_role: role.to_string(),
                message: "Seul le Directeur de Crise (City Director) peut abaisser le seuil de rétention d'urgence.".to_string(),
            });
        }

        if disaster_level < 5 {
            return Err(AppError::DisasterLevelRestricted {
                required_level: 5,
                current_level: disaster_level,
                message: "L'abaissement du seuil de rétention à 15% est strictement réservé au Niveau de Crise 5 (Urgence Absolue).".to_string(),
            });
        }

        Ok(0.15)
    }

    /// Valide la compatibilité géographique de la catastrophe.
    /// Règle stricte : Un TSUNAMI est formellement interdit sur les quartiers enclavés Apex et Warden.
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
                    "Catastrophe incompatible : Le quartier enclavé '{}' ne possède aucun accès maritime. Tsunami impossible.",
                    district_code
                ),
            });
        }

        Ok(())
    }

    /// Valide si le niveau de désastre autorise l'opération demandée :
    /// - Niveau 1 : Surveillance, aucune action de transfert ou de réservation.
    /// - Niveau 2 : Réservations intra-quartier autorisées.
    /// - Niveau 3 : Transferts adjacents autorisés (QC).
    /// - Niveau 4 : Transferts étendus (LC), Réquisitions d'urgence (CD).
    /// - Niveau 5 : Déblocage total, rétention à 15% possible (CD), voies maritimes prioritaires.
    pub fn validate_disaster_level_for_transfer(
        disaster_level: i64,
        is_direct_adjacent: bool,
        role: &str,
    ) -> Result<(), AppError> {
        if disaster_level < 3 {
            return Err(AppError::DisasterLevelRestricted {
                required_level: 3,
                current_level: disaster_level,
                message: "Les transferts de ressources inter-quartiers sont verrouillés en dessous du Niveau de Crise 3.".to_string(),
            });
        }

        // Si le transfert n'est pas directement adjacent (nécessite transit), il faut au minimum niveau 4 ou rôle LC/CD
        if !is_direct_adjacent && disaster_level < 4 {
            return Err(AppError::DisasterLevelRestricted {
                required_level: 4,
                current_level: disaster_level,
                message: "Les transferts non-adjacents nécessitant un transit sont verrouillés en dessous du Niveau de Crise 4.".to_string(),
            });
        }

        if !is_direct_adjacent && role == "QC" && disaster_level < 5 {
            return Err(AppError::InsufficientPermissions {
                required_role: "LC ou CD".to_string(),
                current_role: role.to_string(),
                message: "Un coordonnateur de quartier (QC) ne peut initier que des transferts avec ses voisins directs. Transfert étendu réservé au LC ou CD.".to_string(),
            });
        }

        Ok(())
    }

    /// Calcule la durée estimée de transport.
    /// Règle : La route maritime (SEA) double le temps de transit par rapport à la liaison terrestre de base.
    pub fn calculate_transit_duration(base_transit_minutes: i64, route_type: &str) -> i64 {
        if route_type.eq_ignore_ascii_case("SEA") {
            base_transit_minutes * 2
        } else {
            base_transit_minutes
        }
    }

    /// Vérifie si le hub central Xeno peut autoriser un transit tiers.
    /// Règle : Xeno sert ses propres besoins avant de laisser transiter.
    pub fn validate_xeno_transit_allowance(
        xeno_disaster_level: i64,
        xeno_resource_deficit: bool,
    ) -> Result<(), AppError> {
        // Si Xeno est lui-même en crise majeure (niveau >= 4) avec pénurie interne, transit refusé
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
        // Stock initial de 1000, rétention 30% => min 300
        let min_ret = RulesEngine::calculate_min_retention(1000, 0.30);
        assert_eq!(min_ret, 300);

        // Demande de 600 sur un stock actuel de 1000 => reste 400 >= 300 -> OK
        assert!(RulesEngine::validate_retention("X", "WATER", 1000, 1000, 600, 0.30).is_ok());

        // Demande de 750 sur un stock de 1000 => reste 250 < 300 -> Err
        let err = RulesEngine::validate_retention("X", "WATER", 1000, 1000, 750, 0.30);
        assert!(err.is_err());
    }

    #[test]
    fn test_retention_override_cd_level5() {
        // Un QC ne peut pas déroger à 15%
        assert!(RulesEngine::validate_retention_override("QC", 5).is_err());

        // Un CD en niveau 4 ne peut pas déroger à 15%
        assert!(RulesEngine::validate_retention_override("CD", 4).is_err());

        // Un CD en niveau 5 peut déroger à 15%
        let pct = RulesEngine::validate_retention_override("CD", 5).unwrap();
        assert_eq!(pct, 0.15);
    }

    #[test]
    fn test_disaster_target_validation() {
        // Tsunami sur quartier enclavé (Apex / Warden) doit être rejeté
        assert!(RulesEngine::validate_disaster_target("A", false, "TSUNAMI").is_err());
        assert!(RulesEngine::validate_disaster_target("W", false, "TSUNAMI").is_err());

        // Tsunami sur quartier côtier (Echo, Zion, Xeno) doit réussir
        assert!(RulesEngine::validate_disaster_target("E", true, "TSUNAMI").is_ok());
        assert!(RulesEngine::validate_disaster_target("X", true, "TSUNAMI").is_ok());
        assert!(RulesEngine::validate_disaster_target("Z", true, "TSUNAMI").is_ok());

        // Séisme ou tornade sur quartier enclavé doit réussir
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
