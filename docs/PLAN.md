# infi-Eureka — Build Plan

An exam-prep platform for **NEET students**. Users sign up, pay once, and unlock one-shot videos, notes & highlights, and CBT mock tests. Google Analytics tracks usage.

## User flow

1. User lands on the **signup page** → creates account (or logs in).
2. Logged-in user sees the dashboard with all sections — **videos, notes & highlights, CBT mock tests — but locked**, with a "Unlock everything" button showing the price.
3. Pricing: ~~₹6,000~~ **₹3,499** (discount shown, struck-through original price).
4. User pays → payment verified on the backend → **all features unlock permanently** for that user.

## Stack

| Part | Choice | Why |
|------|--------|-----|
| Backend | Fastify + TypeScript | Fast, and its built-in schema validation enforces our API types for free |
| Frontend | React (Vite) | Simple web app — *(change to Next.js if we want SEO later)* |
| Database | PostgreSQL | Relational data (users, tests, attempts) fits it naturally |
| Auth | Email + password, JWT tokens | Standard, no third-party dependency |
| Payments | Razorpay | The standard for INR payments in India — UPI, cards, netbanking all work |
| Analytics | Google Analytics 4 (GA4) | Loaded in the frontend, tracks page views + key events |

## Folder structure

```
infi-Eureka/
├── backend/
│   ├── src/
│   │   ├── api/routes/      # HTTP endpoints only (auth, videos, notes, tests)
│   │   ├── services/        # business logic
│   │   ├── dao/             # all SQL lives here
│   │   ├── models/          # DB table definitions
│   │   ├── types/           # request/response schemas (Fastify JSON Schema)
│   │   ├── config/          # env, settings
│   │   ├── exceptions/      # custom errors
│   │   ├── integrations/    # external services (video host, etc.)
│   │   └── utils/
│   ├── migrations/versions/
│   └── tests/
├── frontend/
│   └── src/
│       ├── pages/           # Login, Signup, Videos, Notes, MockTest, Results
│       ├── components/
│       ├── api/             # calls to backend
│       └── analytics/       # GA4 setup + event helpers
├── docs/
└── justfile
```

**Rule:** routes → services → dao → db. One direction only. No SQL outside `dao/`.

## Features (build in this order)

### Phase 1 — Scaffold
- Set up backend (Fastify + TS) and frontend (React + Vite) folders.
- Database connection + migration setup.
- Health-check endpoint to prove it all runs.

### Phase 2 — Auth (signup / login / save user)
- `users` table: id, name, email, password_hash, created_at.
- Passwords hashed with bcrypt — never stored as plain text.
- `POST /auth/signup` → creates user, returns JWT.
- `POST /auth/login` → checks password, returns JWT.
- `GET /me` → returns the logged-in user (JWT required).
- Frontend: Signup page, Login page, and route guarding (no token → redirected to login).

### Phase 3 — One-shot videos (self-hosted)
- Video **files** live in file storage (`/storage` folder locally; S3/Cloudflare R2 when deployed) — never inside Postgres.
- Postgres `videos` table stores the info: id, title, subject, chapter, file_path, thumbnail, duration.
- `POST /videos/upload` (saves file to storage + row in DB), `GET /videos` (list, filter by subject), `GET /videos/:id/stream` (streams the file with range support so seeking works).
- Frontend: video list page + player page.

### Phase 4 — Notes & highlights
- `notes` table: id, title, subject, chapter, content/file_url.
- `highlights` table: id, user_id, note_id, highlighted_text, position — each user's highlights are their own.
- `GET /notes`, `GET /notes/:id`, `POST /notes/:id/highlights`, `GET /notes/:id/highlights`.
- Frontend: notes reader where selecting text saves a highlight, and your highlights show up again when you reopen the note.

### Phase 5 — CBT mock tests
- Tables:
  - `tests`: id, title, subject, duration_minutes, total_marks
  - `questions`: id, test_id, question_text, options (A–D), correct_option, marks
  - `attempts`: id, user_id, test_id, started_at, submitted_at, score
  - `attempt_answers`: attempt_id, question_id, chosen_option
- Flow: start test → timer runs → user answers → submit → backend scores it → results page.
- Correct answers are **never sent to the frontend during the test** — scoring happens on the backend.
- `POST /tests/:id/attempts` (start), `PUT /attempts/:id/answers` (save answer), `POST /attempts/:id/submit` (score), `GET /attempts/:id/result`.
- Frontend: test list, test-taking screen (timer, question palette, mark-for-review), results screen with score breakdown.

### Phase 6 — Payments & unlock (Razorpay)
- Tables:
  - `plans`: id, name, mrp (6000), price (3499), currency — price lives in the DB so we can change the discount without touching code.
  - `payments`: id, user_id, plan_id, razorpay_order_id, razorpay_payment_id, amount, status (created / paid / failed), created_at.
  - `users` gets `is_premium` (set to true on successful payment).
- Flow:
  1. `POST /payments/create-order` → backend asks Razorpay for an order of ₹3,499, saves a `payments` row as *created*.
  2. Frontend opens the Razorpay checkout popup (UPI / card / netbanking).
  3. On success, Razorpay gives a payment signature → `POST /payments/verify` → backend **verifies the signature** (never trust the frontend alone), marks payment *paid*, sets `is_premium = true`.
  4. Razorpay **webhook** as backup — if the user closes the tab after paying, the webhook still marks them premium.
- Locking: one backend check (middleware) on all video/notes/test routes — not premium → 403 "payment required". Frontend shows the locked state with the ~~₹6,000~~ ₹3,499 unlock button.
- Amount is always read from the `plans` table on the **backend** — the frontend never decides the price (otherwise anyone could edit the page and pay ₹1).

### Phase 7 — Google Analytics
- GA4 tag in the frontend.
- Track: page views, signup completed, login, video played, note opened, test started, test submitted, **checkout opened, payment completed**.
- Needs a GA4 Measurement ID from your Google Analytics account.

## Decisions made

1. **Database: PostgreSQL** — final. One DB for users, videos info, notes, tests, payments.
2. **Videos: self-hosted** — files in storage, info in Postgres.
3. **One-time payment unlocks everything** — MRP ₹6,000, selling price ₹3,499, via Razorpay.

## Open decisions (need your answer before the relevant phase)

1. **Notes:** PDFs or written text content? (Phase 4)
2. **Who adds content** (videos/notes/questions)? Admin panel, or is seeding the database directly fine for now? (Plan assumes DB seeding to start — an admin panel can come later.)
3. **Razorpay account** — you'll need to create one at razorpay.com; I need its API keys for Phase 6.
4. **GA4 Measurement ID** — create it at analytics.google.com when we reach Phase 7.
