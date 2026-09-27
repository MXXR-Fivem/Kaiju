use actix_web::{get, post, web, HttpResponse};
use serde::Deserialize;

use crate::auth::AuthUser;
use crate::domain::NewTransfer;
use crate::errors::AppError;
use crate::repository::transfer_repo;
use crate::service::transfer_service;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct Review {
    pub approved: bool,
}

#[get("/api/transfers")]
pub async fn transfers(state: web::Data<AppState>, _user: AuthUser) -> Result<HttpResponse, AppError> {
    Ok(HttpResponse::Ok().json(transfer_repo::all(&state.db).await?))
}

#[post("/api/transfers")]
pub async fn create(
    state: web::Data<AppState>,
    user: AuthUser,
    body: web::Json<NewTransfer>,
) -> Result<HttpResponse, AppError> {
    Ok(HttpResponse::Created().json(transfer_service::create(&state, &user, body.into_inner()).await?))
}

#[post("/api/transfers/{id}/review")]
pub async fn review(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<String>,
    body: web::Json<Review>,
) -> Result<HttpResponse, AppError> {
    Ok(HttpResponse::Ok().json(transfer_service::review(&state, &user, &path, body.approved).await?))
}

#[post("/api/transfers/{id}/deliver")]
pub async fn deliver(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    Ok(HttpResponse::Ok().json(transfer_service::deliver(&state, &user, &path).await?))
}
