use actix_web::{get, web, HttpResponse};

use crate::auth::AuthUser;
use crate::errors::AppError;
use crate::repository::{disaster_repo, district_repo};
use crate::state::AppState;

#[get("/api/districts")]
pub async fn districts(state: web::Data<AppState>, _user: AuthUser) -> Result<HttpResponse, AppError> {
    Ok(HttpResponse::Ok().json(district_repo::all(&state.db).await?))
}

#[get("/api/disasters")]
pub async fn disasters(state: web::Data<AppState>, _user: AuthUser) -> Result<HttpResponse, AppError> {
    Ok(HttpResponse::Ok().json(disaster_repo::active(&state.db).await?))
}
