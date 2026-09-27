use actix_web::{get, post, web, HttpResponse};

use crate::auth::AuthUser;
use crate::domain::NewReservation;
use crate::errors::AppError;
use crate::repository::{reservation_repo, resource_repo};
use crate::service::resource_service;
use crate::state::AppState;

#[get("/api/stocks")]
pub async fn stocks(state: web::Data<AppState>, _user: AuthUser) -> Result<HttpResponse, AppError> {
    Ok(HttpResponse::Ok().json(resource_repo::all(&state.db).await?))
}

#[get("/api/reservations")]
pub async fn reservations(state: web::Data<AppState>, _user: AuthUser) -> Result<HttpResponse, AppError> {
    Ok(HttpResponse::Ok().json(reservation_repo::all(&state.db).await?))
}

#[post("/api/reservations")]
pub async fn reserve(
    state: web::Data<AppState>,
    user: AuthUser,
    body: web::Json<NewReservation>,
) -> Result<HttpResponse, AppError> {
    Ok(HttpResponse::Created().json(resource_service::reserve(&state, &user, body.into_inner()).await?))
}

#[post("/api/reservations/{id}/return")]
pub async fn give_back(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    Ok(HttpResponse::Ok().json(resource_service::give_back(&state, &user, &path).await?))
}
