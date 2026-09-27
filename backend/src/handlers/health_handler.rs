use actix_web::{get, HttpResponse};
use serde_json::json;

#[get("/api/health")]
pub async fn health() -> HttpResponse {
    HttpResponse::Ok().json(json!({ "status": "ok" }))
}
