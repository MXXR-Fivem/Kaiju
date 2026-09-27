use actix_web::{http::StatusCode, HttpResponse, ResponseError};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    Validation(String),
    #[error("{0}")]
    Unauthorized(String),
    #[error("{0}")]
    PermissionDenied(String),
    #[error("{0}")]
    NotFound(String),
    #[error("{0}")]
    ResourceConflict(String),
    #[error("{0}")]
    AdjacencyViolation(String),
    #[error("{0}")]
    RetentionViolation(String),
    #[error("{0}")]
    LevelRestricted(String),
    #[error("{0}")]
    AdjacencyPriority(String),
    #[error("{0}")]
    XenoPriority(String),
    #[error("Erreur interne du serveur.")]
    Internal,
}

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            AppError::Validation(_) => "VALIDATION_ERROR",
            AppError::Unauthorized(_) => "UNAUTHORIZED",
            AppError::PermissionDenied(_) => "PERMISSION_DENIED",
            AppError::NotFound(_) => "NOT_FOUND",
            AppError::ResourceConflict(_) => "RESOURCE_CONFLICT",
            AppError::AdjacencyViolation(_) => "ADJACENCY_VIOLATION",
            AppError::RetentionViolation(_) => "RETENTION_VIOLATION",
            AppError::LevelRestricted(_) => "DISASTER_LEVEL_RESTRICTED",
            AppError::AdjacencyPriority(_) => "ADJACENCY_PRIORITY",
            AppError::XenoPriority(_) => "XENO_PRIORITY",
            AppError::Internal => "INTERNAL_ERROR",
        }
    }
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        log::error!("{err}");
        AppError::Internal
    }
}

impl ResponseError for AppError {
    fn status_code(&self) -> StatusCode {
        match self {
            AppError::Validation(_) => StatusCode::BAD_REQUEST,
            AppError::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            AppError::PermissionDenied(_) => StatusCode::FORBIDDEN,
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::ResourceConflict(_) => StatusCode::CONFLICT,
            AppError::AdjacencyViolation(_) => StatusCode::PRECONDITION_FAILED,
            AppError::RetentionViolation(_) => StatusCode::UNPROCESSABLE_ENTITY,
            AppError::LevelRestricted(_) => StatusCode::LOCKED,
            AppError::AdjacencyPriority(_) => StatusCode::FAILED_DEPENDENCY,
            AppError::XenoPriority(_) => StatusCode::from_u16(425).unwrap_or(StatusCode::CONFLICT),
            AppError::Internal => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(json!({
            "error_code": self.code(),
            "message": self.to_string(),
        }))
    }
}
