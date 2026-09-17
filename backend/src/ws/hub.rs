use serde::Serialize;
use std::sync::Arc;
use tokio::sync::broadcast;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "payload")]
pub enum WsEvent {
    #[serde(rename = "RESOURCE_UPDATED")]
    ResourceUpdated {
        district_id: String,
        resource_id: String,
        current_quantity: i64,
        reserved_quantity: i64,
        available_quantity: i64,
    },

    #[serde(rename = "RESOURCE_CONFLICT")]
    ResourceConflict {
        district_code: String,
        resource_code: String,
        message: String,
        contenders: Vec<String>,
    },

    #[serde(rename = "DISASTER_TRIGGERED")]
    DisasterTriggered {
        disaster_id: String,
        district_id: String,
        district_code: String,
        disaster_type: String,
        intensity: i64,
        level: i64,
    },

    #[serde(rename = "DISASTER_RESOLVED")]
    DisasterResolved {
        disaster_id: String,
        district_id: String,
        district_code: String,
    },

    #[serde(rename = "TRANSFER_STATUS_CHANGED")]
    TransferStatusChanged {
        transfer_id: String,
        status: String,
        transit_approval_status: String,
    },

    #[serde(rename = "ALERT")]
    Alert {
        severity: String,
        title: String,
        message: String,
    },
}

#[derive(Clone)]
pub struct WsHub {
    tx: Arc<broadcast::Sender<String>>,
}

impl WsHub {
    pub fn new(capacity: usize) -> Self {
        let (tx, _) = broadcast::channel(capacity);
        Self { tx: Arc::new(tx) }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<String> {
        self.tx.subscribe()
    }

    pub fn broadcast_event(&self, event: WsEvent) {
        if let Ok(json) = serde_json::to_string(&event) {
            let _ = self.tx.send(json);
        }
    }

    pub fn broadcast_raw(&self, message: &str) {
        let _ = self.tx.send(message.to_string());
    }
}
