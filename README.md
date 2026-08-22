# infi-Eureka

A NEET preparation platform: one-shot videos, notes with highlights, and CBT
mock tests, unlocked by a one-time payment.

- **[docs/PRD.md](docs/PRD.md)** — what we are building and why
- **[docs/SRS.md](docs/SRS.md)** — the numbered, testable requirements
- **[docs/PLAN.md](docs/PLAN.md)** — the build phases
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — how the code is organised
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** — setup and day-to-day rules

## Stack

| Part | Choice |
|------|--------|
| Backend | Fastify 5 + TypeScript 6 |
| Frontend | React 19 + Vite |
| Database | PostgreSQL |
| Auth | Email + password, JWT |
| Payments | Razorpay |
| Analytics | Google Analytics 4 |

## Getting started

Needs Node 20+, PostgreSQL 16+, and [`just`](https://just.systems).

```bash
just setup                              # install dependencies for both apps
createdb eureka_dev && createdb eureka_test
cp backend/.env.example backend/.env    # then edit it — see below
cp frontend/.env.example frontend/.env
just migrate && just migrate-test       # apply database migrations
just dev                                # backend :3000, frontend :5173
```

In `backend/.env` you must set `DATABASE_URL` and a `JWT_SECRET`. Generate a
secret with:

```bash
openssl rand -base64 48
```

Razorpay and Google Analytics keys can stay empty until those phases — the app
runs fine without them.

Without `just`, the same commands work directly:

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

## Checking it works

```bash
curl http://localhost:3000/api/v1/health
# {"status":"ok","database":"ok","uptimeSeconds":3}
```

`"database":"ok"` means the whole chain — route to service to DAO to Postgres —
is connected.

## Before committing

```bash
just check       # lint + typecheck + tests, both apps. This is what CI runs.
```

Run `just` on its own to see every available task.

## Layout

```
infi-Eureka/
├── backend/          # Fastify API — see docs/ARCHITECTURE.md
├── frontend/         # React app
├── docs/             # plan and architecture
└── justfile          # task runner
```
