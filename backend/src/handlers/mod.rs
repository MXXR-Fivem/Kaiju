mod auth_handlers;
mod disaster_handlers;
mod district_handlers;
mod health_handler;
mod resource_handlers;
mod transfer_handlers;
mod websocket_handler;

use actix_web::web;

use crate::errors::AppError;

pub fn routes(cfg: &mut web::ServiceConfig) {
    cfg.app_data(web::JsonConfig::default().error_handler(|err, _| AppError::Validation(err.to_string()).into()))
        .service(health_handler::health)
        .service(auth_handlers::register)
        .service(auth_handlers::login)
        .service(district_handlers::districts)
        .service(district_handlers::disasters)
        .service(resource_handlers::stocks)
        .service(resource_handlers::reservations)
        .service(resource_handlers::reserve)
        .service(resource_handlers::give_back)
        .service(transfer_handlers::transfers)
        .service(transfer_handlers::create)
        .service(transfer_handlers::review)
        .service(transfer_handlers::deliver)
        .service(disaster_handlers::lower_retention)
        .service(disaster_handlers::god_mode_verify)
        .service(disaster_handlers::god_mode_trigger)
        .service(disaster_handlers::god_mode_resolve)
        .service(disaster_handlers::god_mode_reset)
        .service(websocket_handler::websocket);
}
