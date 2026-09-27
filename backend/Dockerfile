FROM rust:bookworm AS builder

WORKDIR /usr/src/kaiju-backend

COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src

COPY src ./src
COPY migrations ./migrations
RUN touch src/main.rs && cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /usr/src/kaiju-backend/target/release/kaiju-backend /app/kaiju-backend
RUN mkdir -p /app/data

CMD ["/app/kaiju-backend"]
