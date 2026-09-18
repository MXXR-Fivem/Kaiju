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
        Err(e) => return Err(AppError::InternalError(format!("Echec handshake WebSocket : {}", e))),
    };

    let mut rx = ws_hub.subscribe();

    actix_web::rt::spawn(async move {
        let welcome = serde_json::json!({
            "type": "CONNECTED",
            "payload": {
                "message": "Connecte au reseau tactique KAIJU Tokyork (WebSocket actif)",
                "timestamp": chrono::Utc::now().to_rfc3339()
            }
        });
        let _ = session.text(welcome.to_string()).await;

        loop {
            tokio::select! {
                Ok(broadcast_msg) = rx.recv() => {
                    if session.text(broadcast_msg).await.is_err() {
                        break;
                    }
                }

                Some(Ok(msg)) = msg_stream.next() => {
                    match msg {
                        Message::Ping(bytes) => {
                            if session.pong(&bytes).await.is_err() {
                                break;
                            }
                        }
                        Message::Text(t) => {
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
