use actix_web::{post, web, HttpResponse};

use crate::errors::AppError;
use crate::service::auth_service::{self, Credentials, Registration};
use crate::state::AppState;

#[post("/api/auth/register")]
pub async fn register(state: web::Data<AppState>, body: web::Json<Registration>) -> Result<HttpResponse, AppError> {
    Ok(HttpResponse::Created().json(auth_service::register(&state, body.into_inner()).await?))
}

#[post("/api/auth/login")]
pub async fn login(state: web::Data<AppState>, body: web::Json<Credentials>) -> Result<HttpResponse, AppError> {
    Ok(HttpResponse::Ok().json(auth_service::login(&state, body.into_inner()).await?))
}
