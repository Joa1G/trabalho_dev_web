SHELL := /bin/bash
.DEFAULT_GOAL := help
.PHONY: help up down logs db-shell setup setup-local migrate seed seed-admin test backend front bootstrap reset

help:  ## Lista os alvos disponíveis
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up:           ## Sobe o Postgres (docker compose)
	docker-compose --env-file .env up -d

down:         ## Derruba o Postgres
	docker-compose --env-file .env down

logs:         ## Tail dos logs do Postgres
	docker-compose --env-file .env logs -f db

db-shell:     ## psql dentro do container
	docker-compose --env-file .env exec db psql -U user_modulo1 -d modulo1_alocacao

setup: up migrate seed-admin  ## Setup completo COM Docker: DB up + migrate + seed admin

setup-local: migrate seed-admin  ## Setup SEM Docker: migrate + seed (banco já criado via pgAdmin — ver docs/SETUP_PGADMIN.md)

migrate:      ## Aplica migrations (cria tabelas e seed dos 3 perfis)
	cd backend && uv run python manage.py migrate

seed: migrate ## Alias semântico — os perfis são seedados pela própria migration 0002

seed-admin:   ## Cria/atualiza o admin de dev (admin@instituicao.edu.br / admin123)
	cd backend && uv run python manage.py seed_admin

test:         ## Roda a suite pytest com cobertura
	cd backend && uv run pytest

backend:      ## Roda o Django dev server em 8000
	cd backend && uv run python manage.py runserver 0.0.0.0:8000

front:        ## Roda o Vite dev server em 5173 (proxy /api -> 8000)
	cd frontend && npm run dev

bootstrap:    ## Instala dependências (back + front)
	cd backend && uv sync
	cd frontend && npm install

reset:        ## ATENÇÃO: derruba DB e apaga o volume (perde dados)
	docker-compose --env-file .env down -v
