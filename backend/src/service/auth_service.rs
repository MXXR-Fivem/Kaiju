use actix_web::web;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::auth::{issue_token, AuthUser};
use crate::domain::{Role, User};
use crate::errors::AppError;
use crate::repository::{district_repo, user_repo};
use crate::state::AppState;

#[derive(Deserialize)]
pub struct Credentials {
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct Registration {
    pub username: String,
    pub password: String,
    pub role: Role,
    pub district: Option<String>,
}

#[derive(Serialize)]
pub struct Session {
    pub token: String,
    pub user: AuthUser,
}

pub async fn register(state: &AppState, form: Registration) -> Result<Session, AppError> {
    let username = form.username.trim().to_string();
    if !(3..=32).contains(&username.chars().count()) {
        return Err(AppError::Validation("Le nom d'utilisateur doit contenir entre 3 et 32 caractères.".into()));
    }
    if form.password.chars().count() < 8 {
        return Err(AppError::Validation("Le mot de passe doit contenir au moins 8 caractères.".into()));
    }
    let district_code = match (form.role, form.district) {
        (Role::QC, Some(code)) => Some(district_repo::find(&state.db, &code).await?.code),
        (Role::QC, None) => return Err(AppError::Validation("Un QC doit être rattaché à un quartier.".into())),
        _ => None,
    };
    if user_repo::find_by_username(&state.db, &username).await?.is_some() {
        return Err(AppError::Validation("Ce nom d'utilisateur est déjà pris.".into()));
    }
    let password = form.password;
    let password_hash = web::block(move || bcrypt::hash(password, bcrypt::DEFAULT_COST))
        .await
        .map_err(|_| AppError::Internal)?
        .map_err(|_| AppError::Internal)?;
    let user = User { id: Uuid::new_v4().to_string(), username, password_hash, role: form.role, district_code };
    user_repo::insert(&state.db, &user).await?;
    session(state, &user)
}

pub async fn login(state: &AppState, credentials: Credentials) -> Result<Session, AppError> {
    let invalid = || AppError::Unauthorized("Identifiants invalides.".into());
    let user = user_repo::find_by_username(&state.db, credentials.username.trim())
        .await?
        .ok_or_else(invalid)?;
    let hash = user.password_hash.clone();
    let valid = web::block(move || bcrypt::verify(credentials.password, &hash))
        .await
        .map_err(|_| AppError::Internal)?
        .unwrap_or(false);
    if !valid {
        return Err(invalid());
    }
    session(state, &user)
}

fn session(state: &AppState, user: &User) -> Result<Session, AppError> {
    let (token, user) = issue_token(user, &state.jwt_secret)?;
    Ok(Session { token, user })
}
