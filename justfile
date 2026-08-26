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


# --- Deploy ---

IMAGE_REPO := "asia-south1-docker.pkg.dev/ai-powered-479515/cloud-run-source-deploy/infi-eureka"

# Build a tag and put it live on Cloud Run: just deploy v3
deploy tag:
    #!/usr/bin/env bash
    set -euo pipefail
    IMAGE="{{IMAGE_REPO}}:{{tag}}"

    # The image is built from THIS FOLDER, not from GitHub — anything uncommitted
    # goes live too. Printed so that is a decision rather than a surprise.
    if [ -n "$(git status --porcelain)" ]; then
      echo "Uncommitted changes that will be deployed:"
      git status --short
      echo
    fi

    # --async, because gcloud exits non-zero when it cannot stream build logs
    # (this account cannot) even though the build itself is fine. Polling the
    # build's own status is the only reading that means anything.
    echo "Building {{tag}}..."
    BUILD=$(gcloud builds submit \
      --region asia-south1 \
      --gcs-source-staging-dir gs://ai-powered-479515_asia-south1_cloudbuild/source \
      --tag "$IMAGE" --async --format='value(id)')

    # Poll rather than stream: gcloud cannot stream this project's build logs.
    # The elapsed counter is so a two-minute build does not look like a hang.
    SECONDS=0
    while :; do
      STATUS=$(gcloud builds describe "$BUILD" --region asia-south1 --format='value(status)')
      case "$STATUS" in
        SUCCESS) printf '\r  build succeeded in %ss.        \n' "$SECONDS"; break ;;
        FAILURE|TIMEOUT|CANCELLED|EXPIRED)
          printf '\r  build %s after %ss — nothing deployed.\n' "$STATUS" "$SECONDS"
          echo "  logs: https://console.cloud.google.com/cloud-build/builds;region=asia-south1/$BUILD?project=537688366204"
          exit 1 ;;
      esac
      printf '\r  %s... %ss' "$STATUS" "$SECONDS"
      sleep 5
    done

    gcloud run deploy infi-eureka \
      --image "$IMAGE" \
      --region asia-south1 --max-instances 1 \
      --env-vars-file env.yaml
