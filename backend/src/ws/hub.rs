use serde::Serialize;
use tokio::sync::broadcast;

use crate::domain::TransferStatus;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "payload", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WsEvent {
    ResourceUpdated {
        district: String,
        resource: String,
        current_quantity: i64,
        reserved_quantity: i64,
        available: i64,
    },
    ResourceConflict {
        district: String,
        resource: String,
        contenders: Vec<String>,
        message: String,
    },
    LevelChanged {
        district: String,
        previous_level: i64,
        level: i64,
        city_level: i64,
    },
    TransferUpdated {
        id: String,
        status: TransferStatus,
    },
    RetentionChanged {
        retention_pct: i64,
    },
    Reset,
}

#[derive(Clone)]
pub struct WsHub {
    tx: broadcast::Sender<String>,
}

impl WsHub {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(256);
        Self { tx }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<String> {
        self.tx.subscribe()
    }

    pub fn send(&self, event: WsEvent) {
        if let Ok(json) = serde_json::to_string(&event) {
            let _ = self.tx.send(json);
        }
    }
}
