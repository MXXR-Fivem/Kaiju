use uuid::Uuid;

use super::broadcast_stock;
use crate::auth::AuthUser;
use crate::domain::rules::{self, Action};
use crate::domain::{NewReservation, Reservation};
use crate::errors::AppError;
use crate::repository::{district_repo, reservation_repo, resource_repo};
use crate::state::AppState;
use crate::ws::WsEvent;

pub async fn reserve(state: &AppState, user: &AuthUser, request: NewReservation) -> Result<Reservation, AppError> {
    let db = &state.db;
    if request.quantity <= 0 {
        return Err(AppError::Validation("La quantité doit être positive.".into()));
    }
    if request.team_name.trim().is_empty() {
        return Err(AppError::Validation("Le nom de l'équipe est obligatoire.".into()));
    }
    if request.ends_at <= request.starts_at {
        return Err(AppError::Validation("La fin de la réservation doit suivre son début.".into()));
    }
    rules::authorize(Action::Reserve, user.role, district_repo::city_level(db).await?)?;
    let district = user.district.clone().ok_or(AppError::Internal)?;
    let stock = resource_repo::find(db, &district, &request.resource).await?;

    if request.quantity > stock.available {
        let mut contenders = reservation_repo::active_teams(db, &district, &request.resource).await?;
        contenders.push(request.team_name.trim().to_string());
        let message = format!(
            "{} demande {} × {} dans {} mais seulement {} disponible(s).",
            request.team_name.trim(),
            request.quantity,
            stock.resource_name,
            district,
            stock.available
        );
        state.hub.send(WsEvent::ResourceConflict {
            district: district.clone(),
            resource: request.resource.clone(),
            contenders,
            message: message.clone(),
        });
        return Err(AppError::ResourceConflict(message));
    }

    let id = Uuid::new_v4().to_string();
    let mut tx = db.begin().await?;
    if !resource_repo::reserve(&mut *tx, &district, &request.resource, request.quantity).await? {
        return Err(AppError::ResourceConflict("Le stock a changé entre-temps, réessayez.".into()));
    }
    reservation_repo::insert(&mut *tx, &id, &district, &user.id, &request).await?;
    tx.commit().await?;

    broadcast_stock(state, &district, &request.resource).await?;
    reservation_repo::find(db, &id).await
}

pub async fn give_back(state: &AppState, user: &AuthUser, id: &str) -> Result<Reservation, AppError> {
    let db = &state.db;
    let reservation = reservation_repo::find(db, id).await?;
    if !user.is_qc_of(&reservation.district_code) {
        return Err(AppError::PermissionDenied("Seul le QC du quartier peut restituer cette réservation.".into()));
    }
    let mut tx = db.begin().await?;
    if !reservation_repo::mark_returned(&mut *tx, id).await? {
        return Err(AppError::Validation("Cette réservation a déjà été restituée.".into()));
    }
    resource_repo::release(&mut *tx, &reservation.district_code, &reservation.resource_code, reservation.quantity).await?;
    tx.commit().await?;

    broadcast_stock(state, &reservation.district_code, &reservation.resource_code).await?;
    reservation_repo::find(db, id).await
}
