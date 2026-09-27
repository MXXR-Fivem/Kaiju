pub mod auth_service;
pub mod crisis_service;
pub mod resource_service;
pub mod transfer_service;

use crate::errors::AppError;
use crate::repository::resource_repo;
use crate::state::AppState;
use crate::ws::WsEvent;

pub async fn broadcast_stock(state: &AppState, district: &str, resource: &str) -> Result<(), AppError> {
    let stock = resource_repo::find(&state.db, district, resource).await?;
    state.hub.send(WsEvent::ResourceUpdated {
        district: stock.district_code,
        resource: stock.resource_code,
        current_quantity: stock.current_quantity,
        reserved_quantity: stock.reserved_quantity,
        available: stock.available,
    });
    Ok(())
}
