use chrono::{Duration, Utc};
use uuid::Uuid;

use super::broadcast_stock;
use crate::auth::AuthUser;
use crate::domain::rules::{self, Action, Topology, XENO};
use crate::domain::{NewTransfer, Role, Transfer, TransferStatus};
use crate::errors::AppError;
use crate::repository::{district_repo, resource_repo, transfer_repo};
use crate::state::AppState;
use crate::ws::WsEvent;

pub async fn create(state: &AppState, user: &AuthUser, request: NewTransfer) -> Result<Transfer, AppError> {
    let db = &state.db;
    if request.quantity <= 0 {
        return Err(AppError::Validation("La quantité doit être positive.".into()));
    }
    let topology = district_repo::topology(db).await?;
    for code in [&request.source, &request.target] {
        if !topology.contains(code) {
            return Err(AppError::NotFound(format!("Quartier {code} introuvable.")));
        }
    }
    let level = district_repo::city_level(db).await?;
    let plan = topology.plan(&request.source, &request.target, request.route, level)?;
    let action = match (request.requisition, plan.adjacent) {
        (true, _) => Action::Requisition,
        (false, true) => Action::AdjacentTransfer,
        (false, false) => Action::OrganizeTransit,
    };
    rules::authorize(action, user.role, level)?;
    if user.role == Role::QC && !user.is_qc_of(&request.target) {
        return Err(AppError::PermissionDenied(
            "Un QC ne peut demander des ressources que pour son propre quartier.".into(),
        ));
    }

    let stock = resource_repo::find(db, &request.source, &request.resource).await?;
    rules::check_withdrawal(&stock, request.quantity)?;
    if !plan.adjacent {
        ensure_no_adjacent_supplier(state, &topology, &request).await?;
    }

    let mut transfer = Transfer {
        id: Uuid::new_v4().to_string(),
        requester_id: user.id.clone(),
        requester_name: user.username.clone(),
        source_code: request.source,
        target_code: request.target,
        transit_code: plan.transit.clone(),
        resource_code: request.resource,
        resource_name: stock.resource_name,
        quantity: request.quantity,
        route: plan.route,
        is_requisition: request.requisition,
        source_approved: request.requisition,
        transit_approved: plan.transit.filter(|_| !request.requisition).map(|_| false),
        status: TransferStatus::Pending,
        duration_minutes: plan.minutes,
        created_at: Utc::now(),
        departed_at: None,
        arrival_at: None,
        delivered_at: None,
    };

    if transfer.is_requisition {
        dispatch(state, &mut transfer, true).await?;
    } else {
        transfer_repo::insert(db, &transfer).await?;
        notify_contention(state, &transfer).await?;
    }
    state.hub.send(WsEvent::TransferUpdated { id: transfer.id.clone(), status: transfer.status });
    Ok(transfer)
}

pub async fn review(state: &AppState, user: &AuthUser, id: &str, approved: bool) -> Result<Transfer, AppError> {
    let db = &state.db;
    let mut transfer = transfer_repo::find(db, id).await?;
    if transfer.status != TransferStatus::Pending {
        return Err(AppError::Validation("Ce transfert n'est plus en attente.".into()));
    }
    let as_source = user.is_qc_of(&transfer.source_code) && !transfer.source_approved;
    let as_transit = transfer.transit_code.as_deref().is_some_and(|code| user.is_qc_of(code))
        && transfer.transit_approved == Some(false);
    if !as_source && !as_transit {
        return Err(AppError::PermissionDenied(
            "Seul le QC du quartier source ou de transit peut statuer sur cette demande.".into(),
        ));
    }

    if !approved {
        transfer.status = TransferStatus::Rejected;
        save_pending(state, &transfer).await?;
    } else {
        ensure_level_still_allows(state, &transfer).await?;
        if as_source {
            transfer.source_approved = true;
        } else {
            if transfer.transit_code.as_deref() == Some(XENO)
                && transfer_repo::has_pending_need(db, XENO, &transfer.resource_code).await?
            {
                return Err(AppError::XenoPriority(format!(
                    "Xeno doit d'abord satisfaire ses propres demandes en attente ({}) avant d'autoriser ce transit.",
                    transfer.resource_name
                )));
            }
            transfer.transit_approved = Some(true);
        }
        if transfer.source_approved && transfer.transit_approved != Some(false) {
            dispatch(state, &mut transfer, false).await?;
        } else {
            save_pending(state, &transfer).await?;
        }
    }
    state.hub.send(WsEvent::TransferUpdated { id: transfer.id.clone(), status: transfer.status });
    Ok(transfer)
}

pub async fn deliver(state: &AppState, user: &AuthUser, id: &str) -> Result<Transfer, AppError> {
    let mut transfer = transfer_repo::find(&state.db, id).await?;
    if transfer.status != TransferStatus::InTransit {
        return Err(AppError::Validation("Seul un convoi en route peut être réceptionné.".into()));
    }
    if user.role == Role::QC && !user.is_qc_of(&transfer.target_code) {
        return Err(AppError::PermissionDenied(
            "Seul le QC destinataire, le LC ou le CD peut confirmer la réception.".into(),
        ));
    }
    transfer.status = TransferStatus::Delivered;
    transfer.delivered_at = Some(Utc::now());

    let mut tx = state.db.begin().await?;
    if !transfer_repo::update(&mut *tx, &transfer, TransferStatus::InTransit).await? {
        return Err(AppError::Validation("Ce convoi a déjà été réceptionné.".into()));
    }
    resource_repo::deposit(&mut *tx, &transfer.target_code, &transfer.resource_code, transfer.quantity).await?;
    tx.commit().await?;

    broadcast_stock(state, &transfer.target_code, &transfer.resource_code).await?;
    state.hub.send(WsEvent::TransferUpdated { id: transfer.id.clone(), status: transfer.status });
    Ok(transfer)
}

async fn dispatch(state: &AppState, transfer: &mut Transfer, is_new: bool) -> Result<(), AppError> {
    let stock = resource_repo::find(&state.db, &transfer.source_code, &transfer.resource_code).await?;
    rules::check_withdrawal(&stock, transfer.quantity)?;
    let now = Utc::now();
    transfer.status = TransferStatus::InTransit;
    transfer.departed_at = Some(now);
    transfer.arrival_at = Some(now + Duration::minutes(transfer.duration_minutes));

    let mut tx = state.db.begin().await?;
    let saved = if is_new {
        transfer_repo::insert(&mut *tx, transfer).await?;
        true
    } else {
        transfer_repo::update(&mut *tx, transfer, TransferStatus::Pending).await?
    };
    if !saved || !resource_repo::withdraw(&mut *tx, &stock, transfer.quantity).await? {
        return Err(AppError::ResourceConflict("Le stock ou le transfert a changé entre-temps, réessayez.".into()));
    }
    tx.commit().await?;
    broadcast_stock(state, &transfer.source_code, &transfer.resource_code).await
}

async fn save_pending(state: &AppState, transfer: &Transfer) -> Result<(), AppError> {
    if !transfer_repo::update(&state.db, transfer, TransferStatus::Pending).await? {
        return Err(AppError::Validation("Ce transfert n'est plus en attente.".into()));
    }
    Ok(())
}

async fn ensure_level_still_allows(state: &AppState, transfer: &Transfer) -> Result<(), AppError> {
    let level = district_repo::city_level(&state.db).await?;
    let adjacent = district_repo::topology(&state.db)
        .await?
        .are_adjacent(&transfer.source_code, &transfer.target_code);
    let required = if adjacent { 3 } else { 4 };
    if level < required {
        return Err(AppError::LevelRestricted(format!(
            "Le niveau {level} gèle ce transfert : niveau {required} minimum."
        )));
    }
    Ok(())
}

async fn ensure_no_adjacent_supplier(state: &AppState, topology: &Topology, request: &NewTransfer) -> Result<(), AppError> {
    for neighbor in topology.neighbors(&request.target) {
        let stock = resource_repo::find(&state.db, neighbor, &request.resource).await?;
        if stock.transferable >= request.quantity {
            return Err(AppError::AdjacencyPriority(format!(
                "{neighbor}, adjacent à {}, dispose de {} × {} transférable(s) : il doit être sollicité en priorité.",
                request.target, stock.transferable, stock.resource_name
            )));
        }
    }
    Ok(())
}

async fn notify_contention(state: &AppState, transfer: &Transfer) -> Result<(), AppError> {
    let contenders = transfer_repo::pending_requests(&state.db, &transfer.source_code, &transfer.resource_code).await?;
    if contenders.len() > 1 {
        state.hub.send(WsEvent::ResourceConflict {
            district: transfer.source_code.clone(),
            resource: transfer.resource_code.clone(),
            message: format!(
                "{} demandes concurrentes visent {} de {}.",
                contenders.len(),
                transfer.resource_name,
                transfer.source_code
            ),
            contenders,
        });
    }
    Ok(())
}
