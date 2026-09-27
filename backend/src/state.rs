use crate::ws::WsHub;
use sqlx::SqlitePool;

pub struct AppState {
    pub db: SqlitePool,
    pub hub: WsHub,
    pub jwt_secret: String,
    pub god_mode_password: Option<String>,
}
