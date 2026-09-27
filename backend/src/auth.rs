use actix_web::{dev::Payload, web, FromRequest, HttpRequest};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::future::{ready, Ready};

use crate::domain::{Role, User};
use crate::errors::AppError;
use crate::state::AppState;

const TOKEN_TTL_HOURS: i64 = 12;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthUser {
    pub id: String,
    pub username: String,
    pub role: Role,
    pub district: Option<String>,
    pub exp: i64,
}

impl AuthUser {
    pub fn is_qc_of(&self, district: &str) -> bool {
        self.role == Role::QC && self.district.as_deref() == Some(district)
    }
}

pub fn issue_token(user: &User, secret: &str) -> Result<(String, AuthUser), AppError> {
    let claims = AuthUser {
        id: user.id.clone(),
        username: user.username.clone(),
        role: user.role,
        district: user.district_code.clone(),
        exp: (Utc::now() + Duration::hours(TOKEN_TTL_HOURS)).timestamp(),
    };
    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes()))
        .map_err(|_| AppError::Internal)?;
    Ok((token, claims))
}

pub fn read_token(token: &str, secret: &str) -> Result<AuthUser, AppError> {
    decode::<AuthUser>(token, &DecodingKey::from_secret(secret.as_bytes()), &Validation::default())
        .map(|data| data.claims)
        .map_err(|_| AppError::Unauthorized("Session invalide ou expirée.".into()))
}

impl FromRequest for AuthUser {
    type Error = AppError;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        let token = req
            .headers()
            .get("Authorization")
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.strip_prefix("Bearer "));
        let result = match (token, req.app_data::<web::Data<AppState>>()) {
            (Some(token), Some(state)) => read_token(token, &state.jwt_secret),
            _ => Err(AppError::Unauthorized("Authentification requise.".into())),
        };
        ready(result)
    }
}
