use actix_web::{get, post, web, HttpResponse};
use serde::Deserialize;
use std::sync::Arc;
use crate::errors::AppError;
use crate::service::TransferService;

#[derive(Deserialize)]
pub struct CreateTransferRequestDto {
    pub requester_id: String,
    pub source_district: String,
    pub target_district: String,
    pub resource_code: String,
    pub quantity: i64,
    #[serde(default = "default_route")]
    pub route_type: String, // "LAND" ou "SEA"
}

fn default_route() -> String {
    "LAND".to_string()
}

#[derive(Deserialize)]
pub struct ReviewTransitDto {
    pub approver_role: String,
    pub approved: bool,
}

#[get("/api/transfers")]
pub async fn list_transfers(
    service: web::Data<Arc<TransferService>>,
) -> Result<HttpResponse, AppError> {
    let list = service.list_transfers().await?;
    Ok(HttpResponse::Ok().json(list))
}

#[post("/api/transfers")]
pub async fn create_transfer(
    body: web::Json<CreateTransferRequestDto>,
    service: web::Data<Arc<TransferService>>,
) -> Result<HttpResponse, AppError> {
    let req = body.into_inner();
    let transfer = service.request_transfer(
        &req.requester_id,
        &req.source_district,
        &req.target_district,
        &req.resource_code,
        req.quantity,
        &req.route_type.to_uppercase(),
    ).await?;

    Ok(HttpResponse::Created().json(transfer))
}

#[post("/api/transfers/{id}/transit")]
pub async fn review_transit(
    path: web::Path<String>,
    body: web::Json<ReviewTransitDto>,
    service: web::Data<Arc<TransferService>>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let req = body.into_inner();
    let updated = service.review_transit(&id, &req.approver_role, req.approved).await?;
    Ok(HttpResponse::Ok().json(updated))
}

#[post("/api/transfers/{id}/deliver")]
pub async fn complete_delivery(
    path: web::Path<String>,
    service: web::Data<Arc<TransferService>>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let updated = service.complete_delivery(&id).await?;
    Ok(HttpResponse::Ok().json(updated))
}
