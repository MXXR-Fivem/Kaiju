use actix_web::{get, post, web, HttpResponse};
use serde::Deserialize;
use std::sync::Arc;
use crate::errors::AppError;
use crate::service::ResourceService;

#[derive(Deserialize)]
pub struct CreateReservationRequest {
    pub district_id_or_code: String,
    pub resource_code: String,
    pub user_id: String,
    pub team_name: String,
    pub quantity: i64,
}

#[get("/api/resources/types")]
pub async fn get_resource_types(
    service: web::Data<Arc<ResourceService>>,
) -> Result<HttpResponse, AppError> {
    let types = service.get_resource_types().await?;
    Ok(HttpResponse::Ok().json(types))
}

#[get("/api/resources/inventory")]
pub async fn get_city_inventory(
    service: web::Data<Arc<ResourceService>>,
) -> Result<HttpResponse, AppError> {
    let inventory = service.get_inventory(None).await?;
    Ok(HttpResponse::Ok().json(inventory))
}

#[get("/api/resources/inventory/{district}")]
pub async fn get_district_inventory(
    path: web::Path<String>,
    service: web::Data<Arc<ResourceService>>,
) -> Result<HttpResponse, AppError> {
    let district = path.into_inner();
    let inventory = service.get_inventory(Some(&district)).await?;
    Ok(HttpResponse::Ok().json(inventory))
}

#[post("/api/resources/reserve")]
pub async fn reserve_resource(
    body: web::Json<CreateReservationRequest>,
    service: web::Data<Arc<ResourceService>>,
) -> Result<HttpResponse, AppError> {
    let req = body.into_inner();
    let reservation_id = service.create_reservation(
        &req.district_id_or_code,
        &req.resource_code,
        &req.user_id,
        &req.team_name,
        req.quantity,
    ).await?;

    Ok(HttpResponse::Created().json(serde_json::json!({
        "status": "RESERVED",
        "reservation_id": reservation_id,
        "message": format!("Réservation de {} {} confirmée pour l'unité {}", req.quantity, req.resource_code, req.team_name)
    })))
}

#[post("/api/resources/reserve/{id}/release")]
pub async fn release_reservation(
    path: web::Path<String>,
    service: web::Data<Arc<ResourceService>>,
) -> Result<HttpResponse, AppError> {
    let reservation_id = path.into_inner();
    service.release_reservation(&reservation_id).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "RELEASED",
        "reservation_id": reservation_id
    })))
}
