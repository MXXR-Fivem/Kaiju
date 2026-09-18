use std::sync::Arc;
use uuid::Uuid;
use crate::domain::{RulesEngine, TransferRequest, TransferRequestDetail};
use crate::errors::AppError;
use crate::repository::{DistrictRepository, ResourceRepository, TransferRepository, UserRepository};
use crate::ws::{WsEvent, WsHub};

pub struct TransferService {
    district_repo: Arc<DistrictRepository>,
    resource_repo: Arc<ResourceRepository>,
    transfer_repo: Arc<TransferRepository>,
    user_repo: Arc<UserRepository>,
    ws_hub: Arc<WsHub>,
}

impl TransferService {
    pub fn new(
        district_repo: Arc<DistrictRepository>,
        resource_repo: Arc<ResourceRepository>,
        transfer_repo: Arc<TransferRepository>,
        user_repo: Arc<UserRepository>,
        ws_hub: Arc<WsHub>,
    ) -> Self {
        Self {
            district_repo,
            resource_repo,
            transfer_repo,
            user_repo,
            ws_hub,
        }
    }

    pub async fn request_transfer(
        &self,
        requester_id: &str,
        source_district_id_or_code: &str,
        target_district_id_or_code: &str,
        resource_code: &str,
        quantity: i64,
        requested_route_type: &str,
    ) -> Result<TransferRequest, AppError> {
        if quantity <= 0 {
            return Err(AppError::BadRequest("La quantite demandee doit etre strictement positive.".to_string()));
        }

        let requester = self.user_repo.find_by_id(requester_id).await?
            .or(self.user_repo.find_by_username(requester_id).await?)
            .ok_or_else(|| AppError::NotFound(format!("Operateur '{}' introuvable.", requester_id)))?;

        let source = self.resolve_district(source_district_id_or_code).await?;
        let target = self.resolve_district(target_district_id_or_code).await?;

        if source.id == target.id {
            return Err(AppError::BadRequest("Le quartier source et le quartier cible ne peuvent pas etre identiques.".to_string()));
        }

        if requester.role == "QC" {
            if let Some(ref assigned) = requester.assigned_district_id {
                if assigned != &source.id && assigned != &target.id {
                    return Err(AppError::InsufficientPermissions {
                        required_role: "QC affecte ou LC/CD".to_string(),
                        current_role: requester.role.clone(),
                        message: format!("En tant que QC, vous ne pouvez ordonner des transferts que pour votre propre quartier ({}).", source.code),
                    });
                }
            }
        }

        let res_type = self.resource_repo.find_type_by_code(resource_code).await?
            .ok_or_else(|| AppError::NotFound(format!("Type de ressource '{}' introuvable.", resource_code)))?;

        let direct_adj = self.district_repo.find_adjacency_between(&source.id, &target.id, requested_route_type).await?;

        let (is_direct, transit_district_id, base_minutes) = match direct_adj {
            Some(adj) => (true, None, adj.base_transit_minutes),
            None => {
                let xeno = self.district_repo.find_by_code("X").await?
                    .ok_or_else(|| AppError::InternalError("Quartier Xeno central introuvable.".to_string()))?;

                if source.id == xeno.id || target.id == xeno.id {
                    return Err(AppError::NonAdjacentTransfer {
                        source_code: source.code.clone(),
                        target_code: target.code.clone(),
                        message: format!("Aucune route {} directe disponible entre {} et {}.", requested_route_type, source.code, target.code),
                        transit_required_via: None,
                    });
                }

                let adj_to_xeno = self.district_repo.find_adjacency_between(&source.id, &xeno.id, "LAND").await?;
                let adj_from_xeno = self.district_repo.find_adjacency_between(&xeno.id, &target.id, "LAND").await?;

                if adj_to_xeno.is_none() || adj_from_xeno.is_none() {
                    return Err(AppError::NonAdjacentTransfer {
                        source_code: source.code.clone(),
                        target_code: target.code.clone(),
                        message: format!("Impossible d'etablir un corridor logistique entre {} et {}.", source.code, target.code),
                        transit_required_via: None,
                    });
                }

                let total_minutes = adj_to_xeno.unwrap().base_transit_minutes + adj_from_xeno.unwrap().base_transit_minutes;
                (false, Some(xeno.id), total_minutes)
            }
        };

        let max_disaster_level = source.current_disaster_level.max(target.current_disaster_level);
        RulesEngine::validate_disaster_level_for_transfer(max_disaster_level, is_direct, &requester.role)?;

        if let Some(ref xid) = transit_district_id {
            let xeno = self.district_repo.find_by_id(xid).await?.unwrap();
            let xeno_stock = self.resource_repo.find_district_resource(xid, &res_type.id).await?;
            let is_deficit = xeno_stock.map(|s| s.current_quantity <= RulesEngine::calculate_min_retention(s.initial_quantity, s.min_retention_pct)).unwrap_or(false);
            RulesEngine::validate_xeno_transit_allowance(xeno.current_disaster_level, is_deficit)?;
        }

        let source_stock = self.resource_repo.find_district_resource(&source.id, &res_type.id).await?
            .ok_or_else(|| AppError::NotFound(format!("Stock de {} non initialise pour {}.", resource_code, source.code)))?;

        RulesEngine::validate_retention(
            &source.code,
            resource_code,
            source_stock.initial_quantity,
            source_stock.current_quantity,
            quantity,
            source_stock.min_retention_pct,
        )?;

        let estimated_duration = RulesEngine::calculate_transit_duration(base_minutes, requested_route_type);

        let (initial_status, transit_approval) = if is_direct {
            ("IN_TRANSIT", "NONE")
        } else {
            ("PENDING", "PENDING")
        };

        self.resource_repo.deduct_resource(&source.id, &res_type.id, quantity).await?;

        let transfer_id = format!("tr_{}", Uuid::new_v4().simple());
        let transfer = self.transfer_repo.create(
            &transfer_id,
            &requester.id,
            &source.id,
            &target.id,
            &res_type.id,
            quantity,
            requested_route_type,
            transit_district_id.as_deref(),
            initial_status,
            transit_approval,
            estimated_duration,
        ).await?;

        self.ws_hub.broadcast_event(WsEvent::TransferStatusChanged {
            transfer_id: transfer.id.clone(),
            status: initial_status.to_string(),
            transit_approval_status: transit_approval.to_string(),
        });

        self.ws_hub.broadcast_event(WsEvent::ResourceUpdated {
            district_id: source.id.clone(),
            resource_id: res_type.id.clone(),
            current_quantity: source_stock.current_quantity - quantity,
            reserved_quantity: source_stock.reserved_quantity,
            available_quantity: (source_stock.current_quantity - quantity) - source_stock.reserved_quantity,
        });

        Ok(transfer)
    }

    pub async fn review_transit(
        &self,
        transfer_id: &str,
        approver_role: &str,
        approved: bool,
    ) -> Result<TransferRequest, AppError> {
        let transfer = self.transfer_repo.find_by_id(transfer_id).await?
            .ok_or_else(|| AppError::NotFound(format!("Transfert '{}' introuvable.", transfer_id)))?;

        if transfer.transit_approval_status != "PENDING" {
            return Err(AppError::BadRequest("Ce transfert n'est pas en attente d'approbation de transit.".to_string()));
        }

        if approver_role != "LC" && approver_role != "CD" {
            return Err(AppError::InsufficientPermissions {
                required_role: "LC ou CD".to_string(),
                current_role: approver_role.to_string(),
                message: "Seul le Coordonnateur Logistique (LC) ou le Directeur de Crise (CD) peut autoriser le transit.".to_string(),
            });
        }

        if approved {
            self.transfer_repo.update_transit_approval(transfer_id, "APPROVED").await?;
        } else {
            self.resource_repo.add_resource(&transfer.source_district_id, &transfer.resource_type_id, transfer.quantity).await?;
            self.transfer_repo.update_status(transfer_id, "REJECTED", Some("Transit refuse par la coordination logistique.")).await?;
        }

        let updated = self.transfer_repo.find_by_id(transfer_id).await?.unwrap();

        self.ws_hub.broadcast_event(WsEvent::TransferStatusChanged {
            transfer_id: transfer_id.to_string(),
            status: updated.status.clone(),
            transit_approval_status: updated.transit_approval_status.clone(),
        });

        Ok(updated)
    }

    pub async fn complete_delivery(&self, transfer_id: &str) -> Result<TransferRequest, AppError> {
        let transfer = self.transfer_repo.find_by_id(transfer_id).await?
            .ok_or_else(|| AppError::NotFound(format!("Transfert '{}' introuvable.", transfer_id)))?;

        if transfer.status != "IN_TRANSIT" {
            return Err(AppError::BadRequest("Seul un convoi en cours de transit ('IN_TRANSIT') peut etre receptionne.".to_string()));
        }

        self.resource_repo.add_resource(&transfer.target_district_id, &transfer.resource_type_id, transfer.quantity).await?;
        self.transfer_repo.update_status(transfer_id, "DELIVERED", None).await?;

        let updated = self.transfer_repo.find_by_id(transfer_id).await?.unwrap();

        if let Some(target_stock) = self.resource_repo.find_district_resource(&transfer.target_district_id, &transfer.resource_type_id).await? {
            self.ws_hub.broadcast_event(WsEvent::ResourceUpdated {
                district_id: transfer.target_district_id.clone(),
                resource_id: transfer.resource_type_id.clone(),
                current_quantity: target_stock.current_quantity,
                reserved_quantity: target_stock.reserved_quantity,
                available_quantity: target_stock.current_quantity - target_stock.reserved_quantity,
            });
        }

        self.ws_hub.broadcast_event(WsEvent::TransferStatusChanged {
            transfer_id: transfer_id.to_string(),
            status: "DELIVERED".to_string(),
            transit_approval_status: updated.transit_approval_status.clone(),
        });

        Ok(updated)
    }

    pub async fn list_transfers(&self) -> Result<Vec<TransferRequestDetail>, AppError> {
        self.transfer_repo.find_all_detailed().await
    }

    async fn resolve_district(&self, identifier: &str) -> Result<crate::domain::District, AppError> {
        if let Some(d) = self.district_repo.find_by_code(identifier).await? {
            return Ok(d);
        }
        if let Some(d) = self.district_repo.find_by_id(identifier).await? {
            return Ok(d);
        }
        Err(AppError::NotFound(format!("Quartier '{}' introuvable.", identifier)))
    }
}
