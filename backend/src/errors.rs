use actix_web::{http::StatusCode, HttpResponse, ResponseError};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Violation de la règle de rétention : {message}")]
    RetentionViolation {
        message: String,
        current_quantity: i64,
        requested_quantity: i64,
        min_required_retention: i64,
        retention_percentage: f64,
    },

    #[error("Cible de catastrophe invalide : {message}")]
    InvalidDisasterTarget {
        district_code: String,
        disaster_type: String,
        message: String,
    },

    #[error("Liaison directe impossible entre quartiers non-adjacents : {message}")]
    NonAdjacentTransfer {
        source_code: String,
        target_code: String,
        message: String,
        transit_required_via: Option<String>,
    },

    #[error("Conflit de ressource ou stock insuffisant : {message}")]
    ResourceConflict {
        resource_code: String,
        district_code: String,
        message: String,
    },

    #[error("Permissions insuffisantes pour cette opération de crise : {message}")]
    InsufficientPermissions {
        required_role: String,
        current_role: String,
        message: String,
    },

    #[error("Niveau de crise insuffisant pour débloquer cette action : {message}")]
    DisasterLevelRestricted {
        required_level: i64,
        current_level: i64,
        message: String,
    },

    #[error("Transit bloqué par le carrefour central Xeno : {message}")]
    TransitDeniedByXeno {
        message: String,
    },

    #[error("Accès God Mode refusé : mot de passe invalide")]
    UnauthorizedGodMode,

    #[error("Élément introuvable : {0}")]
    NotFound(String),

    #[error("Erreur de validation : {0}")]
    BadRequest(String),

    #[error("Erreur interne de persistance : {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("Erreur interne du système : {0}")]
    InternalError(String),
}

#[derive(Serialize)]
pub struct ErrorResponse {
    pub error_code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

impl ResponseError for AppError {
    fn status_code(&self) -> StatusCode {
        match self {
            AppError::RetentionViolation { .. } => StatusCode::UNPROCESSABLE_ENTITY, // 422
            AppError::InvalidDisasterTarget { .. } => StatusCode::UNPROCESSABLE_ENTITY, // 422
            AppError::NonAdjacentTransfer { .. } => StatusCode::BAD_REQUEST, // 400
            AppError::ResourceConflict { .. } => StatusCode::CONFLICT, // 409
            AppError::InsufficientPermissions { .. } => StatusCode::FORBIDDEN, // 403
            AppError::DisasterLevelRestricted { .. } => StatusCode::FORBIDDEN, // 403
            AppError::TransitDeniedByXeno { .. } => StatusCode::CONFLICT, // 409
            AppError::UnauthorizedGodMode => StatusCode::UNAUTHORIZED, // 401
            AppError::NotFound(_) => StatusCode::NOT_FOUND, // 404
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST, // 400
            AppError::DatabaseError(_) => StatusCode::INTERNAL_SERVER_ERROR, // 500
            AppError::InternalError(_) => StatusCode::INTERNAL_SERVER_ERROR, // 500
        }
    }

    fn error_response(&self) -> HttpResponse {
        let (error_code, details) = match self {
            AppError::RetentionViolation { current_quantity, requested_quantity, min_required_retention, retention_percentage, .. } => (
                "RETENTION_RULE_VIOLATION",
                Some(serde_json::json!({
                    "current_quantity": current_quantity,
                    "requested_quantity": requested_quantity,
                    "min_required_retention": min_required_retention,
                    "retention_percentage": retention_percentage,
                })),
            ),
            AppError::InvalidDisasterTarget { district_code, disaster_type, .. } => (
                "INVALID_COASTAL_TARGET",
                Some(serde_json::json!({
                    "district_code": district_code,
                    "disaster_type": disaster_type,
                    "reason": "Les quartiers enclavés Apex et Warden ne possèdent pas de littoral pour un Tsunami."
                })),
            ),
            AppError::NonAdjacentTransfer { source_code, target_code, transit_required_via, .. } => (
                "NON_ADJACENT_DISTRICTS",
                Some(serde_json::json!({
                    "source_code": source_code,
                    "target_code": target_code,
                    "transit_required_via": transit_required_via,
                })),
            ),
            AppError::ResourceConflict { resource_code, district_code, .. } => (
                "RESOURCE_CONTENTION",
                Some(serde_json::json!({
                    "resource_code": resource_code,
                    "district_code": district_code,
                })),
            ),
            AppError::InsufficientPermissions { required_role, current_role, .. } => (
                "ROLE_PERMISSION_DENIED",
                Some(serde_json::json!({
                    "required_role": required_role,
                    "current_role": current_role,
                })),
            ),
            AppError::DisasterLevelRestricted { required_level, current_level, .. } => (
                "DISASTER_LEVEL_TOO_LOW",
                Some(serde_json::json!({
                    "required_level": required_level,
                    "current_level": current_level,
                })),
            ),
            AppError::TransitDeniedByXeno { .. } => (
                "XENO_TRANSIT_PRIORITY_BLOCKED",
                None,
            ),
            AppError::UnauthorizedGodMode => (
                "UNAUTHORIZED_GOD_MODE",
                None,
            ),
            AppError::NotFound(_) => ("NOT_FOUND", None),
            AppError::BadRequest(_) => ("BAD_REQUEST", None),
            AppError::DatabaseError(_) => ("DATABASE_ERROR", None),
            AppError::InternalError(_) => ("INTERNAL_ERROR", None),
        };

        HttpResponse::build(self.status_code()).json(ErrorResponse {
            error_code: error_code.to_string(),
            message: self.to_string(),
            details,
        })
    }
}
