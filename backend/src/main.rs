use actix_cors::Cors;
use actix_web::{middleware::Logger, web, App, HttpServer};
use dotenvy::dotenv;
use std::sync::Arc;

mod config;
mod domain;
mod errors;
mod handlers;
mod repository;
mod service;
mod ws;

use config::init_db_pool;
use handlers::*;
use repository::*;
use service::*;
use ws::WsHub;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // 1. Initialisation de l'environnement et du logger
    dotenv().ok();
    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var("RUST_LOG", "info,actix_web=info");
    }
    env_logger::init();

    log::info!("=================================================================");
    log::info!("  KAIJU - Crisis Manager :: Système Opérationnel de Tokyork");
    log::info!("=================================================================");

    let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .expect("PORT doit être un entier valide");

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite://kaiju.db".to_string());

    // 2. Initialisation de la base SQLite et exécution du schéma
    let pool = init_db_pool(&database_url)
        .await
        .expect("Échec critique de connexion à la base SQLite Tokyork");

    // 3. Couche Repository (SQL Pur)
    let district_repo = Arc::new(DistrictRepository::new(pool.clone()));
    let resource_repo = Arc::new(ResourceRepository::new(pool.clone()));
    let disaster_repo = Arc::new(DisasterRepository::new(pool.clone()));
    let transfer_repo = Arc::new(TransferRepository::new(pool.clone()));
    let user_repo = Arc::new(UserRepository::new(pool.clone()));

    // 4. Hub WebSocket Temps Réel
    let ws_hub = Arc::new(WsHub::new(1024));

    // 5. Couche Service (Métier et Moteur de Règles)
    let crisis_service = Arc::new(CrisisService::new(
        district_repo.clone(),
        disaster_repo.clone(),
        resource_repo.clone(),
        ws_hub.clone(),
    ));

    let transfer_service = Arc::new(TransferService::new(
        district_repo.clone(),
        resource_repo.clone(),
        transfer_repo.clone(),
        user_repo.clone(),
        ws_hub.clone(),
    ));

    let resource_service = Arc::new(ResourceService::new(
        district_repo.clone(),
        resource_repo.clone(),
        ws_hub.clone(),
    ));

    log::info!("Serveur KAIJU en écoute sur http://{}:{}", host, port);

    // 6. Démarrage du serveur HTTP Actix
    HttpServer::new(move || {
        let cors = Cors::permissive();

        App::new()
            .wrap(Logger::default())
            .wrap(cors)
            // Injection des dépendances
            .app_data(web::Data::new(district_repo.clone()))
            .app_data(web::Data::new(resource_repo.clone()))
            .app_data(web::Data::new(disaster_repo.clone()))
            .app_data(web::Data::new(transfer_repo.clone()))
            .app_data(web::Data::new(user_repo.clone()))
            .app_data(web::Data::new(ws_hub.clone()))
            .app_data(web::Data::new(crisis_service.clone()))
            .app_data(web::Data::new(transfer_service.clone()))
            .app_data(web::Data::new(resource_service.clone()))
            // Handlers HTTP
            .service(health_check)
            // Quartiers
            .service(get_all_districts)
            .service(get_district_by_id_or_code)
            .service(get_district_adjacencies)
            // Ressources & Réservations
            .service(get_resource_types)
            .service(get_city_inventory)
            .service(get_district_inventory)
            .service(reserve_resource)
            .service(release_reservation)
            // Transferts
            .service(list_transfers)
            .service(create_transfer)
            .service(review_transit)
            .service(complete_delivery)
            // Catastrophes & God Mode
            .service(get_active_disaster)
            .service(resolve_disaster)
            .service(verify_god_mode_auth)
            .service(god_mode_trigger)
            .service(god_mode_retention_override)
            // WebSocket
            .service(websocket_route)
    })
    .bind((host.as_str(), port))?
    .run()
    .await
}
