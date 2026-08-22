# infi-Eureka task runner. Run `just` to see everything available.

default:
    @just --list

# Install dependencies for both apps
setup:
    cd backend && npm install
    cd frontend && npm install
    @echo "Now copy backend/.env.example to backend/.env and fill it in."

# Run backend (:3000) and frontend (:5173) together
dev:
    #!/usr/bin/env bash
    trap 'kill 0' EXIT
    cd backend && npm run dev &
    cd frontend && npm run dev &
    wait

dev-backend:
    cd backend && npm run dev

dev-frontend:
    cd frontend && npm run dev

# --- Database ---

# Apply pending migrations
migrate:
    cd backend && npm run migrate:up

# Create a migration: just migration add_videos_table
migration name:
    cd backend && npm run migrate:new -- {{name}}

# Apply migrations to the test database
migrate-test:
    cd backend && npm run migrate:test

# Load seed content (safe to re-run)
seed:
    cd backend && npm run seed

# DESTRUCTIVE: drop every table, re-migrate, re-seed
db-reset:
    cd backend && npm run db:reset

# --- Checks ---

lint:
    cd backend && npm run lint
    cd frontend && npm run lint

typecheck:
    cd backend && npm run typecheck
    cd frontend && npm run typecheck

test:
    cd backend && npm test

test-unit:
    cd backend && npm run test:unit

test-integration:
    cd backend && npm run test:integration

test-watch:
    cd backend && npm run test:watch

format:
    cd backend && npm run format
    cd frontend && npm run format

# Everything CI runs. Must pass before opening a PR.
check: lint typecheck test

build:
    cd backend && npm run build
    cd frontend && npm run build
