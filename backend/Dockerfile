# =============================================================================
# KAIJU - Crisis Manager : Backend Rust Dockerfile (Multi-stage Build)
# =============================================================================

# --- Stage 1 : Build ---
FROM rust:1.80-bookworm AS builder

WORKDIR /usr/src/kaiju-backend

# Créer un projet fictif pour pré-cacher les dépendances
COPY Cargo.toml ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release || true

# Copier le code source réel et les migrations
COPY src ./src
COPY migrations ./migrations

# Forcer le re-build du code source
RUN touch src/main.rs && cargo build --release

# --- Stage 2 : Runtime Minimal ---
FROM debian:bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

# Copier le binaire compilé
COPY --from=builder /usr/src/kaiju-backend/target/release/kaiju-backend /app/kaiju-backend
COPY --from=builder /usr/src/kaiju-backend/migrations /app/migrations

# Création du répertoire pour la base SQLite persistante
RUN mkdir -p /app/data

EXPOSE 8080

ENV RUST_LOG=info
ENV PORT=8080
ENV HOST=0.0.0.0
ENV DATABASE_URL=sqlite:///app/data/kaiju.db

CMD ["/app/kaiju-backend"]
