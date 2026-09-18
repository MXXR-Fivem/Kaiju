FROM rust:bookworm AS builder

WORKDIR /usr/src/kaiju-backend

COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release || true

COPY src ./src
COPY migrations ./migrations

RUN rm -f target/release/deps/kaiju_backend* && cargo build --release

FROM debian:bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/kaiju-backend/target/release/kaiju-backend /app/kaiju-backend
COPY --from=builder /usr/src/kaiju-backend/migrations /app/migrations

RUN mkdir -p /app/data

EXPOSE 8080

ENV RUST_LOG=info
ENV PORT=8080
ENV HOST=0.0.0.0
ENV DATABASE_URL=sqlite:///app/data/kaiju.db

CMD ["/app/kaiju-backend"]
