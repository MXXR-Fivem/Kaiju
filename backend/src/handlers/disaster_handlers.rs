use actix_web::{post, web, HttpResponse};
use serde::Deserialize;

use crate::auth::AuthUser;
use crate::domain::DisasterType;
use crate::errors::AppError;
use crate::service::crisis_service;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct GodMode {
    pub password: String,
}

#[derive(Deserialize)]
pub struct DisasterOrder {
    pub password: String,
    pub district: String,
    pub disaster_type: DisasterType,
    pub level: i64,
}

#[derive(Deserialize)]
pub struct ResolveOrder {
    pub password: String,
    pub district: String,
}

fn check_god_mode(state: &AppState, password: &str) -> Result<(), AppError> {
    match &state.god_mode_password {
        Some(expected) if expected == password => Ok(()),
        _ => Err(AppError::Unauthorized("Mot de passe god mode invalide.".into())),
    }
}

#[post("/api/retention/lower")]
pub async fn lower_retention(state: web::Data<AppState>, user: AuthUser) -> Result<HttpResponse, AppError> {
    crisis_service::lower_retention(&state, &user).await?;
    Ok(HttpResponse::NoContent().finish())
}

#[post("/api/god-mode/verify")]
pub async fn god_mode_verify(state: web::Data<AppState>, body: web::Json<GodMode>) -> Result<HttpResponse, AppError> {
    check_god_mode(&state, &body.password)?;
    Ok(HttpResponse::NoContent().finish())
}

#[post("/api/god-mode/disasters")]
pub async fn god_mode_trigger(
    state: web::Data<AppState>,
    body: web::Json<DisasterOrder>,
) -> Result<HttpResponse, AppError> {
    check_god_mode(&state, &body.password)?;
    let disaster = crisis_service::trigger(&state, &body.district, body.disaster_type, body.level).await?;
    Ok(HttpResponse::Created().json(disaster))
}

#[post("/api/god-mode/resolve")]
pub async fn god_mode_resolve(state: web::Data<AppState>, body: web::Json<ResolveOrder>) -> Result<HttpResponse, AppError> {
    check_god_mode(&state, &body.password)?;
    crisis_service::resolve(&state, &body.district).await?;
    Ok(HttpResponse::NoContent().finish())
}

#[post("/api/god-mode/reset")]
pub async fn god_mode_reset(state: web::Data<AppState>, body: web::Json<GodMode>) -> Result<HttpResponse, AppError> {
    check_god_mode(&state, &body.password)?;
    crisis_service::reset(&state).await?;
    Ok(HttpResponse::NoContent().finish())
}
