use actix_web::{get, web, HttpRequest, HttpResponse};
use actix_ws::Message;
use futures_util::StreamExt;
use serde::Deserialize;

use crate::auth::read_token;
use crate::errors::AppError;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct WsQuery {
    pub token: Option<String>,
}

#[get("/ws")]
pub async fn websocket(
    req: HttpRequest,
    body: web::Payload,
    query: web::Query<WsQuery>,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    read_token(query.token.as_deref().unwrap_or_default(), &state.jwt_secret)?;
    let (response, mut session, mut messages) = actix_ws::handle(&req, body).map_err(|_| AppError::Internal)?;
    let mut events = state.hub.subscribe();

    actix_web::rt::spawn(async move {
        loop {
            tokio::select! {
                Ok(event) = events.recv() => {
                    if session.text(event).await.is_err() {
                        break;
                    }
                }
                Some(Ok(message)) = messages.next() => match message {
                    Message::Ping(bytes) => {
                        if session.pong(&bytes).await.is_err() {
                            break;
                        }
                    }
                    Message::Close(reason) => {
                        let _ = session.close(reason).await;
                        break;
                    }
                    _ => {}
                },
                else => break,
            }
        }
    });

    Ok(response)
}
