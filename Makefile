.DEFAULT_GOAL := help
SHELL := /bin/bash

CYAN    := \033[36m
GREEN   := \033[32m
YELLOW  := \033[33m
RED     := \033[31m
BOLD    := \033[1m
RESET   := \033[0m

.PHONY: help build up down restart logs logs-backend logs-frontend test test-backend test-frontend clean seed check

help: ## Affiche ce menu d'aide opérationnel
	@echo -e "$(BOLD)$(CYAN)=====================================================================$(RESET)"
	@echo -e "$(BOLD)$(YELLOW)  KAIJU - Crisis Manager :: Système Opérationnel de Tokyork$(RESET)"
	@echo -e "$(BOLD)$(CYAN)=====================================================================$(RESET)"
	@echo -e "Commandes disponibles pour le déploiement et la gestion de crise :\n"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-18s$(RESET) %s\n", $$1, $$2}'
	@echo ""

build: ## Compile les conteneurs Docker (Frontend & Backend)
	@echo -e "$(CYAN)[KAIJU] Construction des images Docker...$(RESET)"
	docker compose build

up: ## Démarre tous les services en arrière-plan (Front, Back, DB)
	@echo -e "$(GREEN)[KAIJU] Déploiement des services de gestion de crise...$(RESET)"
	docker compose up -d
	@echo -e "$(GREEN)[KAIJU] Plateforme prête ! Front: http://localhost:4200 | Back: http://localhost:8080$(RESET)"

down: ## Arrête l'ensemble des conteneurs
	@echo -e "$(YELLOW)[KAIJU] Extinction des services...$(RESET)"
	docker compose down

restart: down up ## Redémarre l'ensemble des services KAIJU

logs: ## Affiche les logs en continu de tous les conteneurs
	docker compose logs -f

logs-backend: ## Affiche les logs en direct du backend Rust
	docker compose logs -f backend

logs-frontend: ## Affiche les logs en direct du frontend Angular
	docker compose logs -f frontend

test: test-backend test-frontend ## Exécute l'ensemble des tests (Backend + Frontend)

test-backend: ## Lance les tests unitaires et d'intégration Rust
	@echo -e "$(CYAN)[KAIJU] Exécution des tests du moteur de règles Rust...$(RESET)"
	cd backend && cargo test

test-frontend: ## Lance les tests du frontend Angular
	@echo -e "$(CYAN)[KAIJU] Exécution des tests Angular...$(RESET)"
	cd frontend && npm test -- --watch=false --browsers=ChromeHeadless || true

seed: ## Initialise et alimente la base SQLite avec les 5 quartiers et 10 ressources
	@echo -e "$(YELLOW)[KAIJU] Réinitialisation de la base SQLite et injection du seed...$(RESET)"
	mkdir -p backend/data
	sqlite3 backend/kaiju.db < backend/migrations/20260917000001_init_schema.sql
	@echo -e "$(GREEN)[KAIJU] Données de Tokyork injectées avec succès !$(RESET)"

check: ## Vérifie l'état des conteneurs et la santé de l'API
	@echo -e "$(CYAN)[KAIJU] Statut des conteneurs :$(RESET)"
	docker compose ps
	@echo -e "$(CYAN)[KAIJU] Healthcheck API :$(RESET)"
	curl -s http://localhost:8080/api/health || echo -e "$(RED)API non joignable actuellement.$(RESET)"

clean: ## Nettoie les caches de build et fichiers temporaires
	@echo -e "$(RED)[KAIJU] Nettoyage des artefacts de compilation...$(RESET)"
	cd backend && cargo clean || true
	rm -rf frontend/dist frontend/.angular
	docker compose down -v --remove-orphans || true
