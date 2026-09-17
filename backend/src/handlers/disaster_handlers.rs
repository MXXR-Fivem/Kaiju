use actix_web::{get, post, web, HttpResponse};
use serde::Deserialize;
use std::sync::Arc;
use crate::errors::AppError;
use crate::service::CrisisService;

#[derive(Deserialize)]
pub struct GodModeTriggerRequest {
    pub secret_password: String,
    pub district_target: String, // Code ou ID (A, E, W, X, Z)
    pub disaster_type: String,   // EARTHQUAKE, TSUNAMI, TORNADO
    pub intensity: i64,          // 1 à 100
}

#[derive(Deserialize)]
pub struct RetentionOverrideRequest {
    pub secret_password: String,
    pub district_target: String,
    pub user_role: String,       // Doit être "CD"
}

#[derive(Deserialize)]
pub struct GodModeAuthRequest {
    pub secret_password: String,
}

#[get("/api/disaster/active")]
pub async fn get_active_disaster(
    service: web::Data<Arc<CrisisService>>,
) -> Result<HttpResponse, AppError> {
    let disaster = service.get_active_disaster().await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "active_disaster": disaster
    })))
}

#[post("/api/disaster/resolve")]
pub async fn resolve_disaster(
    service: web::Data<Arc<CrisisService>>,
) -> Result<HttpResponse, AppError> {
    let resolved = service.resolve_disaster().await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "RESOLVED",
        "disaster": resolved
    })))
}

#[post("/api/god-mode/verify")]
pub async fn verify_god_mode_auth(
    body: web::Json<GodModeAuthRequest>,
) -> Result<HttpResponse, AppError> {
    let expected = std::env::var("GOD_MODE_PASSWORD").unwrap_or_else(|_| "kaiju-omega-protocol-2026".to_string());
    if body.secret_password != expected {
        return Err(AppError::UnauthorizedGodMode);
    }
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "authenticated": true,
        "role": "GOD_ADMIN"
    })))
}

#[post("/api/god-mode/trigger")]
pub async fn god_mode_trigger(
    body: web::Json<GodModeTriggerRequest>,
    service: web::Data<Arc<CrisisService>>,
) -> Result<HttpResponse, AppError> {
    let req = body.into_inner();
    let expected = std::env::var("GOD_MODE_PASSWORD").unwrap_or_else(|_| "kaiju-omega-protocol-2026".to_string());

    if req.secret_password != expected {
        return Err(AppError::UnauthorizedGodMode);
    }

    let disaster = service.trigger_disaster(
        &req.district_target,
        &req.disaster_type,
        req.intensity,
        "GOD_MODE",
    ).await?;

    Ok(HttpResponse::Created().json(disaster))
}

#[post("/api/god-mode/retention-override")]
pub async fn god_mode_retention_override(
    body: web::Json<RetentionOverrideRequest>,
    service: web::Data<Arc<CrisisService>>,
) -> Result<HttpResponse, AppError> {
    let req = body.into_inner();
    let expected = std::env::var("GOD_MODE_PASSWORD").unwrap_or_else(|_| "kaiju-omega-protocol-2026".to_string());

    if req.secret_password != expected {
        return Err(AppError::UnauthorizedGodMode);
    }

    let new_pct = service.apply_retention_override(
        &req.district_target,
        &req.user_role,
    ).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "OVERRIDDEN",
        "district": req.district_target,
        "new_min_retention_pct": new_pct,
        "message": "Seuil de rétention abaissé à 15% par prérogative du City Director."
    })))
}
