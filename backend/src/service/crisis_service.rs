use chrono::Utc;
use uuid::Uuid;

use crate::auth::AuthUser;
use crate::domain::rules::{self, Action, DEFAULT_RETENTION_PCT, LOWERED_RETENTION_PCT};
use crate::domain::{Disaster, DisasterType, District};
use crate::errors::AppError;
use crate::repository::{self, disaster_repo, district_repo, resource_repo};
use crate::state::AppState;
use crate::ws::WsEvent;

pub async fn trigger(
    state: &AppState,
    district_code: &str,
    disaster_type: DisasterType,
    level: i64,
) -> Result<Disaster, AppError> {
    if !(1..=5).contains(&level) {
        return Err(AppError::Validation("Le niveau doit être compris entre 1 et 5.".into()));
    }
    let district = district_repo::find(&state.db, district_code).await?;
    if disaster_type == DisasterType::Tsunami && !district.is_coastal {
        return Err(AppError::Validation(format!("Un tsunami ne peut pas frapper {} : quartier sans accès à la baie.", district.name)));
    }
    let now = Utc::now();
    let disaster = Disaster {
        id: Uuid::new_v4().to_string(),
        district_code: district.code.clone(),
        disaster_type,
        level,
        active: true,
        triggered_at: now,
        resolved_at: None,
    };
    let mut tx = state.db.begin().await?;
    disaster_repo::resolve(&mut *tx, &district.code, now).await?;
    disaster_repo::insert(&mut *tx, &disaster).await?;
    district_repo::set_level(&mut *tx, &district.code, level).await?;
    tx.commit().await?;

    announce_level(state, &district, level).await?;
    Ok(disaster)
}

pub async fn resolve(state: &AppState, district_code: &str) -> Result<(), AppError> {
    let district = district_repo::find(&state.db, district_code).await?;
    let mut tx = state.db.begin().await?;
    disaster_repo::resolve(&mut *tx, &district.code, Utc::now()).await?;
    district_repo::set_level(&mut *tx, &district.code, 1).await?;
    tx.commit().await?;

    announce_level(state, &district, 1).await
}

pub async fn lower_retention(state: &AppState, user: &AuthUser) -> Result<(), AppError> {
    rules::authorize(Action::LowerRetention, user.role, district_repo::city_level(&state.db).await?)?;
    if resource_repo::set_retention(&state.db, LOWERED_RETENTION_PCT).await? {
        state.hub.send(WsEvent::RetentionChanged { retention_pct: LOWERED_RETENTION_PCT });
    }
    Ok(())
}

pub async fn reset(state: &AppState) -> Result<(), AppError> {
    repository::reset(&state.db).await?;
    state.hub.send(WsEvent::Reset);
    Ok(())
}

async fn announce_level(state: &AppState, district: &District, level: i64) -> Result<(), AppError> {
    let city_level = district_repo::city_level(&state.db).await?;
    if city_level < 5 && resource_repo::set_retention(&state.db, DEFAULT_RETENTION_PCT).await? {
        state.hub.send(WsEvent::RetentionChanged { retention_pct: DEFAULT_RETENTION_PCT });
    }
    state.hub.send(WsEvent::LevelChanged {
        district: district.code.clone(),
        previous_level: district.disaster_level,
        level,
        city_level,
    });
    Ok(())
}
