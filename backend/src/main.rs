use actix_cors::Cors;
use actix_web::{middleware::Logger, web, App, HttpServer};

mod auth;
mod config;
mod domain;
mod errors;
mod handlers;
mod repository;
mod service;
mod state;
mod ws;

use state::AppState;

fn required_env(key: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| panic!("Variable d'environnement {key} manquante"))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".into());
    let port: u16 = required_env("PORT").parse().expect("PORT invalide");
    let db = config::init_db_pool(&required_env("DATABASE_URL"))
        .await
        .expect("Connexion à la base impossible");

    let state = web::Data::new(AppState {
        db,
        hub: ws::WsHub::new(),
        jwt_secret: required_env("JWT_SECRET"),
        god_mode_password: std::env::var("GOD_MODE_PASSWORD").ok().filter(|p| !p.is_empty()),
    });

    log::info!("KAIJU backend sur {host}:{port}");
    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .wrap(Cors::permissive())
            .app_data(state.clone())
            .configure(handlers::routes)
    })
    .bind((host, port))?
    .run()
    .await
}
