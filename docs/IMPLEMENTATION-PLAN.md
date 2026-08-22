# infi-Eureka — Implementation Plan (Short Version)

A condensed view of `docs/PLAN.md`. Build order, what each phase delivers, and what blocks it.

## What we are building

One web app: student signs up → sees everything locked → pays once (₹3,499, MRP ₹6,000 struck through) → everything unlocks permanently. Three features behind the paywall: one-shot videos, notes with highlights, and CBT mock tests.

**Free preview:** an unpaid student is not fully locked out. Exactly **one item of each type is open as a sample** — one video, one note, one mock test — so they can try the real thing before paying. Everything else stays visible but locked.

## Stack

| Part | Choice | Why |
|---|---|---|
| Backend | Fastify + TypeScript | Fast, and its built-in schema validation checks every request/response shape for free |
| Frontend | React (Vite) | Simple web app, quick to build; switch to Next.js later only if SEO matters |
| Database | PostgreSQL, hosted on **Supabase** | Users, tests, attempts, payments are relational data — a relational DB fits naturally. Supabase is ordinary Postgres run for us, so no code changes; we use only its database |
| Video hosting | Bunny Stream | Two-hour lectures need adaptive quality for patchy mobile data — plain file storage would buffer badly |
| Auth | Email + password, JWT | Standard, no third-party dependency, nothing to pay for |
| Payments | Razorpay | The standard for INR payments in India — UPI, cards, netbanking all work out of the box |
| Analytics | Google Analytics 4 | Free, and the funnel (landing → signup → paid) is readable without building our own dashboards |

**Layering rule:** routes → services → dao → db, one direction only. All SQL lives in `dao/`.

## How we use Supabase

Supabase bundles four things: a Postgres database, an auth system, file storage, and an auto-generated public API. **We use only the database.** We already built our own auth (phone/OTP + JWT) and our own API (Fastify), so the rest would sit unused.

**The public API is switched off.** Left on, Supabase exposes every table in the `public` schema to the open internet, and locking that down means writing access rules for all 12 tables. We disabled the Data API at project creation instead, so the Fastify backend is the only way in. If anyone re-enables it, that work becomes mandatory.

**Connecting.** Supabase offers three connection strings and the choice matters:

| Route | Port | Use |
|---|---|---|
| Direct connection | 5432 | The documented choice for a long-running server — but **IPv6-only** unless you pay for the IPv4 add-on |
| Session pooler | 5432 | Same thing over IPv4. **This is what we use**, because IPv6 was unreachable from our network |
| Transaction pooler | 6543 | For serverless functions. Wrong for us — it would fight our own connection pool |

The session pooler username is `postgres.<project-ref>`, not plain `postgres`. That is expected, not a typo.

**Setting it up from scratch** (roughly ten minutes):

1. Create the project at supabase.com. Save the database password — it is shown once.
2. Region: South Asia (Mumbai). Uncheck **Enable Data API**.
3. Copy the session pooler connection string into `DATABASE_URL` in `backend/.env`.
4. `npm run migrate:up` builds all 12 tables, then `npm run seed` loads content.
5. Confirm with `/api/v1/health`, which should report `"database":"ok"`.

**Free tier limits** — 500 MB database, 1 GB file storage, 5 GB egress, 50,000 monthly users, 2 projects. Our data is far below all of these. The catch is that **free projects pause after a week of inactivity**, which is fine while building and unacceptable once students depend on it — budget for the paid plan (~$25/month) before launch.

Videos never touch Supabase. 1 GB of storage and 5 GB of transfer would vanish after a handful of students watching a single lecture; they go to Bunny Stream. Question figures are small enough to serve from our own storage.

## The seven phases, in order

### Phase 1 — Scaffold
Backend and frontend folders, database connection, migration setup, and a health-check endpoint that proves it all runs. No product features yet.

### Phase 2 — Auth
`users` table with bcrypt-hashed passwords. Endpoints: `POST /auth/signup`, `POST /auth/login`, `GET /me`. Frontend gets Signup and Login pages plus route guarding — no token means redirect to login.

### Phase 3 — One-shot videos
Video files live in file storage (`/storage` locally, S3/R2 in production), never in Postgres — only their metadata (title, subject, chapter, path, duration) does. Upload, list-with-subject-filter, and a streaming endpoint with range support so seeking works. Frontend: video list and player pages.

### Phase 4 — Notes & highlights
`notes` table for content, `highlights` table keyed by user so each student's highlights are private. Selecting text in the reader saves a highlight automatically; reopening the note brings them back on any device.

### Phase 5 — CBT mock tests
Tables: `tests`, `questions`, `attempts`, `attempt_answers`. Flow: start → server-side timer → answers save as the student goes → submit (or auto-submit at time-up) → backend scores it (+4 / −1 / 0) → results page. Correct answers are never sent to the browser during the test. Frontend: test list, test screen with timer + question palette + mark-for-review, and a results screen.

### Phase 6 — Payments & unlock (Razorpay)
Price lives in a `plans` table (MRP 6000, price 3499) so the discount changes without a deploy. Flow: backend creates a Razorpay order → checkout popup → backend verifies the payment signature → sets `is_premium = true`. A Razorpay webhook is the backup path: if the tab closes mid-payment, the student still unlocks. One backend middleware locks all video/notes/test routes for non-premium users — **except sample content**: videos, notes and tests get an `is_free_sample` flag, and the middleware lets any logged-in user through to a flagged item. One item per type is flagged. The frontend shows samples as open and everything else with a lock. The frontend never decides the amount.

### Phase 7 — Google Analytics
GA4 tag in the frontend. Track page views plus the key events: signup, login, video played, note opened, test started/submitted, checkout opened, payment completed — so the landing → signup → checkout → paid funnel is readable in GA4.

## Decisions already made

1. PostgreSQL is final — one DB for everything, hosted on Supabase with its public API disabled.
2. Videos are hosted on Bunny Stream, not self-hosted — only their metadata and link live in Postgres.
3. One-time payment unlocks everything, via Razorpay.
4. Notes are rich text (HTML), not PDFs — highlighting needs real text.
5. Content is loaded by seeding the database in v1 — no admin panel yet.
6. Unpaid users get one free sample of each type (one video, one note, one test). *(Note: this updates the PRD, which currently lists sample content as out of scope.)*

## Credentials needed, and why

| Credential | Why we need it | Blocks |
|---|---|---|
| **Razorpay API keys** (key id + secret) + **webhook secret** | The backend uses the keys to create payment orders and verify payment signatures — this is what makes payment unfakeable from the browser. The webhook secret proves a "payment done" callback really came from Razorpay. Test keys are enough to build; live keys only at launch. | Phase 6 |
| **GA4 Measurement ID** | The ID that tells Google Analytics which account to send our page views and events to. Without it, no funnel data. | Phase 7 |
| **Gupshup API key** | For sending WhatsApp/SMS messages to students (e.g. payment receipt, login OTP). *Not in the current phases — needed only if we add messaging; noting it here so the account gets created in time.* | — |
| **Supabase database password** | Goes inside `DATABASE_URL`. Shown once at project creation and not recoverable — only resettable. | Done |
| **Bunny Stream API key + library ID** | Where lecture videos are uploaded and streamed from. Local `/storage` works for building. | Deploy |

## Also needed from us

| Needed | Blocks |
|---|---|
| The `figures/` folder — 1,449 question images (298 of them for the MT papers) | Showing the 928 questions that contain diagrams |
| Answer keys for the 9 Custom-Practice-Test papers | Scoring those 1,513 questions |
| How much content at launch (videos, notes, question banks) | Launch date only |

## Question bank status

| Set | Papers | Questions | Answers | Usable now |
|---|---|---|---|---|
| MT-01 … MT-10 | 10 | 1,800 | ✅ all 1,800 | 1,644 — the other 156 need figures |
| Custom-Practice-Test | 9 | 1,513 | ❌ none | 0 — no answer keys |

Answer keys were extracted from the MT key PDFs and joined to questions on **paper + printed question number**, never on position, so a missing question cannot shift the rest. Two questions (MT-03 Q166, MT-05 Q170) were image-only and were transcribed from the source PDFs; both are flagged `recovered` in the data. Files: `backend/data/answer_key.json` and `backend/data/question_bank.json`.

## Related documents

- `docs/PLAN.md` — the full build plan this summarizes
- `docs/PRD.md` — product requirements
- `docs/SRS.md` — numbered, testable requirements
- `docs/ARCHITECTURE.md` — system design and why
