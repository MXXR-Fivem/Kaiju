use std::sync::Arc;
use uuid::Uuid;
use crate::domain::{DistrictResourceDetail, ResourceType};
use crate::errors::AppError;
use crate::repository::{DistrictRepository, ResourceRepository};
use crate::ws::{WsEvent, WsHub};

pub struct ResourceService {
    district_repo: Arc<DistrictRepository>,
    resource_repo: Arc<ResourceRepository>,
    ws_hub: Arc<WsHub>,
}

impl ResourceService {
    pub fn new(
        district_repo: Arc<DistrictRepository>,
        resource_repo: Arc<ResourceRepository>,
        ws_hub: Arc<WsHub>,
    ) -> Self {
        Self {
            district_repo,
            resource_repo,
            ws_hub,
        }
    }

    pub async fn get_resource_types(&self) -> Result<Vec<ResourceType>, AppError> {
        self.resource_repo.find_all_types().await
    }

    pub async fn get_inventory(&self, district_id_or_code: Option<&str>) -> Result<Vec<DistrictResourceDetail>, AppError> {
        let district_id = if let Some(code_or_id) = district_id_or_code {
            if let Some(d) = self.district_repo.find_by_code(code_or_id).await? {
                Some(d.id)
            } else if let Some(d) = self.district_repo.find_by_id(code_or_id).await? {
                Some(d.id)
            } else {
                return Err(AppError::NotFound(format!("Quartier '{}' introuvable.", code_or_id)));
            }
        } else {
            None
        };

        self.resource_repo.find_district_resources_detailed(district_id.as_deref()).await
    }

    /// Création d'une réservation intra-quartier (autorisée à partir du Niveau de Crise 2)
    pub async fn create_reservation(
        &self,
        district_id_or_code: &str,
        resource_code: &str,
        user_id: &str,
        team_name: &str,
        quantity: i64,
    ) -> Result<String, AppError> {
        if quantity <= 0 {
            return Err(AppError::BadRequest("La quantité à réserver doit être supérieure à 0.".to_string()));
        }

        let district = if let Some(d) = self.district_repo.find_by_code(district_id_or_code).await? {
            d
        } else if let Some(d) = self.district_repo.find_by_id(district_id_or_code).await? {
            d
        } else {
            return Err(AppError::NotFound(format!("Quartier '{}' introuvable.", district_id_or_code)));
        };

        // Règle de niveau : Réservations débloquées dès le niveau 2
        if district.current_disaster_level < 2 {
            return Err(AppError::DisasterLevelRestricted {
                required_level: 2,
                current_level: district.current_disaster_level,
                message: "Les réservations d'urgence intra-quartier ne sont autorisées qu'à partir du Niveau 2 d'alerte.".to_string(),
            });
        }

        let res_type = self.resource_repo.find_type_by_code(resource_code).await?
            .ok_or_else(|| AppError::NotFound(format!("Ressource '{}' introuvable.", resource_code)))?;

        let current_stock = self.resource_repo.find_district_resource(&district.id, &res_type.id).await?
            .ok_or_else(|| AppError::NotFound("Stock non alloué pour ce quartier.".to_string()))?;

        let available = current_stock.current_quantity - current_stock.reserved_quantity;

        // Détection de conflit : si la demande dépasse le stock disponible restant
        if quantity > available {
            // Notification immédiate du conflit par WebSocket
            self.ws_hub.broadcast_event(WsEvent::ResourceConflict {
                district_code: district.code.clone(),
                resource_code: resource_code.to_string(),
                message: format!(
                    "CONFLIT DE RESSOURCE dans {} : L'unité '{}' tente de réserver {} {} alors qu'il n'en reste que {}.",
                    district.code, team_name, quantity, res_type.unit, available
                ),
                contenders: vec![team_name.to_string()],
            });

            return Err(AppError::ResourceConflict {
                resource_code: resource_code.to_string(),
                district_code: district.code.clone(),
                message: format!(
                    "Stock disponible insuffisant : {} disponibles contre {} requis par l'équipe '{}'.",
                    available, quantity, team_name
                ),
            });
        }

        let reservation_id = format!("resv_{}", Uuid::new_v4().simple());
        self.resource_repo.create_reservation(
            &reservation_id,
            &district.id,
            &res_type.id,
            user_id,
            team_name,
            quantity,
        ).await?;

        // Broadcast de la mise à jour des stocks
        self.ws_hub.broadcast_event(WsEvent::ResourceUpdated {
            district_id: district.id.clone(),
            resource_id: res_type.id.clone(),
            current_quantity: current_stock.current_quantity,
            reserved_quantity: current_stock.reserved_quantity + quantity,
            available_quantity: available - quantity,
        });

        Ok(reservation_id)
    }

    pub async fn release_reservation(&self, reservation_id: &str) -> Result<(), AppError> {
        self.resource_repo.release_reservation(reservation_id).await
    }
}
