use actix_web::{get, web, HttpRequest, HttpResponse};
use actix_ws::Message;
use futures_util::StreamExt;
use std::sync::Arc;
use crate::errors::AppError;
use crate::ws::WsHub;

#[get("/ws")]
pub async fn websocket_route(
    req: HttpRequest,
    body: web::Payload,
    ws_hub: web::Data<Arc<WsHub>>,
) -> Result<HttpResponse, AppError> {
    let (response, mut session, mut msg_stream) = match actix_ws::handle(&req, body) {
        Ok(res) => res,
        Err(e) => return Err(AppError::InternalError(format!("Échec handshake WebSocket : {}", e))),
    };

    let mut rx = ws_hub.subscribe();

    // Spawn une tâche pour gérer la communication bidirectionnelle
    actix_web::rt::spawn(async move {
        // Envoi d'un message initial de confirmation de connexion
        let welcome = serde_json::json!({
            "type": "CONNECTED",
            "payload": {
                "message": "Connecté au réseau tactique KAIJU Tokyork (WebSocket actif)",
                "timestamp": chrono::Utc::now().to_rfc3339()
            }
        });
        let _ = session.text(welcome.to_string()).await;

        loop {
            tokio::select! {
                // Messages entrants depuis le broadcast Hub
                Ok(broadcast_msg) = rx.recv() => {
                    if session.text(broadcast_msg).await.is_err() {
                        break;
                    }
                }

                // Messages entrants depuis le client WebSocket
                Some(Ok(msg)) = msg_stream.next() => {
                    match msg {
                        Message::Ping(bytes) => {
                            if session.pong(&bytes).await.is_err() {
                                break;
                            }
                        }
                        Message::Text(t) => {
                            // Si le client envoie un ping texte ou keepalive
                            if t.trim() == "ping" {
                                let _ = session.text(r#"{"type":"PONG"}"#).await;
                            }
                        }
                        Message::Close(reason) => {
                            let _ = session.close(reason).await;
                            break;
                        }
                        _ => {}
                    }
                }

                else => break,
            }
        }
    });

    Ok(response)
}
