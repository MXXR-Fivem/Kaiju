use actix_web::{get, HttpResponse, Responder};
use serde::Serialize;

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    city: &'static str,
    system: &'static str,
    version: &'static str,
}

#[get("/api/health")]
pub async fn health_check() -> impl Responder {
    HttpResponse::Ok().json(HealthResponse {
        status: "OPERATIONAL",
        city: "Tokyork",
        system: "KAIJU Crisis Manager",
        version: "1.0.0",
    })
}
