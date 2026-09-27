-include .env
export

.PHONY: up down logs test e2e clean

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

test:
	cd backend && cargo test

e2e:
	cd e2e && npm ci && npx playwright install chromium && npx playwright test

clean:
	docker compose down -v --remove-orphans
	rm -rf backend/target frontend/dist frontend/.angular
