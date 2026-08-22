# infi-Eureka — Software Requirements Specification (SRS)

**Version:** 1.0
**Date:** 2026-08-21
**Traces to:** `docs/PRD.md` v1.0

---

## 1. Purpose and scope

This document turns the PRD into requirements that can be built and tested. Every requirement here is numbered, has one clear pass/fail condition, and belongs to exactly one build phase.

Scope is the infi-Eureka web application: a Fastify/TypeScript backend, a React frontend, a PostgreSQL database, Razorpay for payments, and GA4 for analytics. Content administration tooling is out of scope for v1.

**How to read a requirement:** *shall* means mandatory for v1. *should* means wanted but not blocking.

---

## 2. Definitions

| Term | Meaning |
|---|---|
| **Student / user** | A registered account holder. The only human actor in v1. |
| **Premium** | A user whose `users.is_premium` is `true`. Has permanent access to all content. |
| **Locked user** | A registered user who has not paid. Can log in and browse titles, cannot open content. |
| **Gated route** | A backend endpoint that returns `403` unless the caller is premium. |
| **Attempt** | One student's single run at one mock test. |
| **Paise** | 1/100 of a rupee. All money is stored and transmitted as whole paise, never as a decimal. ₹3,499 = `349900`. |
| **JWT** | The signed token the server issues at login, which the browser sends back on every request. |
| **One-shot video** | A long full-chapter revision lecture. |

---

## 3. Actors and external systems

| Actor | Role |
|---|---|
| Anonymous visitor | Can reach the landing, signup and login pages only. |
| Locked user | Authenticated, not paid. |
| Premium user | Authenticated and paid. |
| Razorpay | External payment gateway. Creates orders, runs checkout, signs results, calls our webhook. |
| Google Analytics 4 | External. Receives frontend events. Never receives personally identifying data. |
| File storage | Local `/storage` folder in development; S3 or Cloudflare R2 in production. Holds video files and thumbnails. |

---

## 4. Functional requirements

### 4.1 Accounts and authentication — Phase 2

| ID | Requirement | Pass condition |
|---|---|---|
| FR-A-01 | The system shall let a visitor create an account with name, email and password. | `POST /auth/signup` with valid input returns `201` and a JWT. |
| FR-A-02 | Email shall be unique across users, compared case-insensitively. | A second signup with the same email in any casing returns `409`. |
| FR-A-03 | Password shall be at least 8 characters. | A 7-character password returns `400`. |
| FR-A-04 | Passwords shall be stored only as a bcrypt hash, cost factor ≥ 10. | No column anywhere holds a readable password. Verified by inspecting the `users` table. |
| FR-A-05 | The system shall authenticate a user by email and password. | `POST /auth/login` with correct credentials returns `200` and a JWT. |
| FR-A-06 | A failed login shall not reveal whether the email exists. | Wrong email and wrong password both return the identical `401` body. |
| FR-A-07 | A JWT shall carry only the user id and an expiry, and shall expire in 7 days. | Decoding the token shows `sub` and `exp` and no other claims. |
| FR-A-08 | The system shall return the current user's profile. | `GET /me` with a valid token returns id, name, email, `is_premium`. |
| FR-A-09 | A request to a protected endpoint without a valid token shall be rejected. | Missing, malformed or expired token returns `401`. |
| FR-A-10 | The frontend shall redirect a logged-out visitor away from any protected page to `/login`. | Visiting `/dashboard` with no token lands on `/login`. |
| FR-A-11 | The frontend shall keep the session across browser restarts. | Closing and reopening the browser keeps the user logged in until token expiry. |
| FR-A-12 | Logging out shall clear the stored token. | After logout, protected pages redirect to login. |

### 4.2 Access control and payments — Phase 6

| ID | Requirement | Pass condition |
|---|---|---|
| FR-P-01 | Every video, notes and test content endpoint shall be a gated route. | A locked user calling any of them gets `403` with code `PAYMENT_REQUIRED`. |
| FR-P-02 | Premium status shall be read from the database on each gated request, not from the JWT. | A user who pays gains access on their **next request**, with no re-login. |
| FR-P-03 | List endpoints shall return titles and metadata to locked users, but never the content itself. | `GET /videos` returns titles for a locked user; `GET /videos/:id/stream` returns `403`. |
| FR-P-04 | The system shall expose the active plan's pricing. | `GET /plans/active` returns `mrp_paise`, `price_paise`, `currency`. |
| FR-P-05 | The order amount shall be read from the `plans` table on the server. | The client sends no amount. A request carrying an amount field has it ignored. |
| FR-P-06 | The system shall create a Razorpay order and persist a `payments` row with status `created`. | `POST /payments/create-order` returns a Razorpay order id and writes one row. |
| FR-P-07 | An already-premium user shall not be able to create an order. | `POST /payments/create-order` returns `409` for a premium user. |
| FR-P-08 | The system shall verify the Razorpay signature using HMAC-SHA256 over `order_id\|payment_id` with the key secret. | A tampered signature returns `400` and the payment stays `created`. |
| FR-P-09 | On a verified payment, the system shall set the payment to `paid` and the user to premium, in one database transaction. | Either both change or neither does. |
| FR-P-10 | The system shall accept a Razorpay webhook and apply the same state change. | A `payment.captured` webhook for an unverified order marks it paid and the user premium. |
| FR-P-11 | The webhook shall verify Razorpay's `X-Razorpay-Signature` header before acting. | An unsigned or wrongly signed webhook returns `400` and changes nothing. |
| FR-P-12 | Marking a payment paid shall be idempotent. | Running verify and webhook for the same order, in either order and any number of times, leaves exactly one paid payment and one premium user. |
| FR-P-13 | A payment shall only move `created → paid` or `created → failed`. | Any other transition is rejected and logged. |
| FR-P-14 | Every payment attempt shall be recorded, successful or not. | A failed payment leaves a row with status `failed`. |
| FR-P-15 | The frontend shall never receive the Razorpay key secret. | Only `RAZORPAY_KEY_ID` reaches the browser. Grepping the frontend bundle for the secret finds nothing. |
| FR-P-16 | Premium access shall have no expiry. | No code path anywhere sets `is_premium` back to `false`. |

### 4.3 One-shot videos — Phase 3

| ID | Requirement | Pass condition |
|---|---|---|
| FR-V-01 | The system shall list videos with title, subject, chapter, thumbnail and duration. | `GET /videos` returns those fields. |
| FR-V-02 | The list shall be filterable by subject. | `GET /videos?subject=physics` returns only Physics videos. |
| FR-V-03 | Video binary files shall be stored in file storage, never in PostgreSQL. | The `videos` table holds a path, not bytes. |
| FR-V-04 | The stream endpoint shall support HTTP range requests. | A request with `Range: bytes=1000-2000` returns `206 Partial Content` with `Content-Range` set. |
| FR-V-05 | Seeking in the player shall work without re-downloading the file. | Dragging the scrubber issues a new range request and playback resumes there. |
| FR-V-06 | Streaming shall be authorised by a short-lived signed stream token, because a `<video>` tag cannot send an `Authorization` header. | `GET /videos/:id/stream-token` returns a token valid for 5 minutes; `GET /videos/:id/stream?t=...` accepts only a valid, unexpired token issued to that user for that video. |
| FR-V-07 | A locked user shall not be issued a stream token. | `GET /videos/:id/stream-token` returns `403`. |
| FR-V-08 | A request for a missing video shall return a clean error. | `GET /videos/:id` for an unknown id returns `404`, not a stack trace. |
| FR-V-09 | Upload shall accept a video file and write both the file and its database row, or neither. | A failed database insert leaves no orphan file. |

### 4.4 Notes and highlights — Phase 4

| ID | Requirement | Pass condition |
|---|---|---|
| FR-N-01 | The system shall list notes with title, subject and chapter, filterable by subject. | `GET /notes?subject=biology` returns only Biology notes. |
| FR-N-02 | The system shall return a note's full content. | `GET /notes/:id` returns the sanitised HTML body. |
| FR-N-03 | Note HTML shall be sanitised before it is rendered. | A note containing `<script>` renders as inert text. |
| FR-N-04 | The system shall save a highlight against a user and a note. | `POST /notes/:id/highlights` with text and offsets returns `201`. |
| FR-N-05 | A highlight shall store the selected text plus its start and end character offsets, so it can be re-applied exactly. | Reopening the note re-marks the same characters. |
| FR-N-06 | The system shall return only the requesting user's highlights for a note. | Two users highlighting the same note each see only their own. |
| FR-N-07 | A user shall be able to delete their own highlight. | `DELETE /highlights/:id` returns `204`. |
| FR-N-08 | A user shall not be able to delete another user's highlight. | The same call on someone else's highlight returns `404`, not `403` — we do not confirm it exists. |
| FR-N-09 | Creating a highlight shall need no explicit save action. | Releasing the text selection triggers the save. |
| FR-N-10 | Deleting a note shall delete its highlights. | Foreign key `ON DELETE CASCADE`. |

### 4.5 CBT mock tests — Phase 5

| ID | Requirement | Pass condition |
|---|---|---|
| FR-T-01 | The system shall list tests with title, subject, duration, question count and total marks. | `GET /tests` returns those fields. |
| FR-T-02 | Starting a test shall create an attempt stamped with `started_at` and a server-computed `expires_at`. | `POST /tests/:id/attempts` returns an attempt id and both timestamps. |
| FR-T-03 | The question payload sent during a test shall never contain `correct_option`. | Inspecting the network response during a live attempt shows no correct answers. Enforced by the response schema, not by hand. |
| FR-T-04 | A student shall have at most one in-progress attempt per test. | A second start while one is in progress returns the existing attempt, not a new one. |
| FR-T-05 | Each answer shall be saved individually as the student makes it. | `PUT /attempts/:id/answers` with one question id and one option returns `200`. |
| FR-T-06 | Saving the same question twice shall overwrite, not duplicate. | Unique constraint on `(attempt_id, question_id)` with upsert. |
| FR-T-07 | A student shall be able to clear an answer. | Sending `chosen_option: null` removes it; the question counts as unattempted. |
| FR-T-08 | A student shall be able to flag a question for review. | The flag persists and is returned in the attempt state. |
| FR-T-09 | The attempt state shall be retrievable so a refresh resumes exactly where the student was. | `GET /attempts/:id` returns saved answers, review flags, and seconds remaining. |
| FR-T-10 | Time remaining shall be computed on the server. | The browser clock has no effect on it. Changing the system clock does not extend the test. |
| FR-T-11 | Answers submitted after `expires_at` shall be rejected. | `PUT /attempts/:id/answers` past expiry returns `409 ATTEMPT_EXPIRED`. |
| FR-T-12 | Submitting shall score the attempt on the server and set `submitted_at`. | `POST /attempts/:id/submit` returns the score. |
| FR-T-13 | Scoring shall follow NEET marking: +4 correct, −1 wrong, 0 unattempted, per-question values read from the `questions` table. | A 5-question attempt with 3 right, 1 wrong, 1 blank scores 11. |
| FR-T-14 | A test not submitted before expiry shall be scored on whatever was saved. | Requesting the result of an expired unsubmitted attempt auto-submits and scores it. |
| FR-T-15 | An attempt shall be submittable exactly once. | A second submit returns `409 ALREADY_SUBMITTED`. |
| FR-T-16 | The result shall include total score, correct/wrong/unattempted counts, and every question with the student's answer and the correct one. | `GET /attempts/:id/result` returns all of it. |
| FR-T-17 | Correct answers shall be released only after submission. | Before submit, the result endpoint returns `409`. |
| FR-T-18 | A student shall only be able to read their own attempts. | Another user's attempt id returns `404`. |
| FR-T-19 | The test screen shall show a question palette colour-coded answered / unanswered / marked for review. | Visual check. |
| FR-T-20 | The test screen shall show a live countdown, seeded from the server's remaining seconds. | Visual check; refreshing does not reset it. |

### 4.6 Analytics — Phase 7

| ID | Requirement | Pass condition |
|---|---|---|
| FR-G-01 | The GA4 tag shall load on every page. | GA4 realtime shows the session. |
| FR-G-02 | A page view shall fire on every client-side route change. | Navigating in-app produces distinct page views. |
| FR-G-03 | The events `sign_up`, `login`, `video_played`, `note_opened`, `test_started`, `test_submitted`, `checkout_opened`, `payment_completed` shall fire at their moments. | Each appears in GA4 DebugView. |
| FR-G-04 | No email, name or password shall ever be sent to GA4. | Event payloads carry ids and counts only. |
| FR-G-05 | The measurement ID shall come from an environment variable. | Changing environments needs no code change. |

---

## 5. API contract

All request and response bodies are JSON. All endpoints are versioned under `/api/v1`. Every shape below is declared as a Fastify JSON Schema, which means it is validated at runtime and typed at compile time from one definition.

**Auth** — `🔓` public · `🔑` needs login · `💳` needs login **and** premium

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/auth/signup` | 🔓 | Create account, return JWT |
| `POST` | `/auth/login` | 🔓 | Return JWT |
| `GET` | `/me` | 🔑 | Current user incl. `is_premium` |
| `GET` | `/plans/active` | 🔓 | MRP and current price |
| `POST` | `/payments/create-order` | 🔑 | Create Razorpay order |
| `POST` | `/payments/verify` | 🔑 | Verify signature, grant premium |
| `POST` | `/payments/webhook` | 🔓* | Razorpay callback (*signature-verified, not JWT) |
| `GET` | `/videos` | 🔑 | List (titles visible when locked) |
| `GET` | `/videos/:id` | 🔑 | Video detail |
| `GET` | `/videos/:id/stream-token` | 💳 | 5-minute signed stream token |
| `GET` | `/videos/:id/stream?t=` | 💳 | Byte-range video stream |
| `GET` | `/notes` | 🔑 | List notes |
| `GET` | `/notes/:id` | 💳 | Note body |
| `GET` | `/notes/:id/highlights` | 💳 | My highlights on this note |
| `POST` | `/notes/:id/highlights` | 💳 | Create highlight |
| `DELETE` | `/highlights/:id` | 💳 | Delete my highlight |
| `GET` | `/tests` | 🔑 | List tests |
| `GET` | `/tests/:id` | 💳 | Test detail (no questions) |
| `POST` | `/tests/:id/attempts` | 💳 | Start or resume attempt |
| `GET` | `/attempts/:id` | 💳 | Live state: questions, saved answers, seconds left |
| `PUT` | `/attempts/:id/answers` | 💳 | Save one answer or review flag |
| `POST` | `/attempts/:id/submit` | 💳 | Score and close |
| `GET` | `/attempts/:id/result` | 💳 | Score + full breakdown |
| `GET` | `/health` | 🔓 | Liveness and database check |

---

## 6. Data requirements

| Rule | Reason |
|---|---|
| DR-01 — All money is stored as `BIGINT` paise. | Floating point cannot represent money exactly. Razorpay's API works in paise anyway. |
| DR-02 — All timestamps are `TIMESTAMPTZ` in UTC. | Students are all in one timezone today, servers may not be. Store UTC, format on display. |
| DR-03 — Primary keys are `BIGSERIAL`. | Simple, ordered, cheap to index. |
| DR-04 — `users.email` is `CITEXT UNIQUE`. | Case-insensitive uniqueness enforced by the database, not by application code. |
| DR-05 — Every foreign key declares its `ON DELETE` behaviour explicitly. | Deleting a note must not leave orphan highlights. |
| DR-06 — `questions.correct_option` is never selected by any query that serves a live attempt. | The safest way to not leak an answer is to not fetch it. |
| DR-07 — `payments.razorpay_order_id` is `UNIQUE`. | The database, not application logic, is what makes double-crediting impossible. |
| DR-08 — Every schema change is a numbered, forward-only migration file. | The schema must be reproducible from an empty database on any machine. |
| DR-09 — No SQL exists outside `src/dao/`. | One place to audit for injection, one place to tune queries. |
| DR-10 — All queries are parameterised. Never string-concatenated. | SQL injection. |

Full table definitions are in `docs/ARCHITECTURE.md` §4.

---

## 7. Non-functional requirements

### 7.1 Performance

| ID | Requirement |
|---|---|
| NFR-P-01 | API responses other than video streaming shall complete within 300 ms at the 95th percentile, measured on the server. |
| NFR-P-02 | Video playback shall begin within 3 seconds of pressing play on a 10 Mbps connection. |
| NFR-P-03 | Saving a mock-test answer shall complete within 200 ms; the UI shall not block on it. |
| NFR-P-04 | The system shall handle 200 concurrent students in a mock test without response times doubling. |
| NFR-P-05 | Frontend first contentful paint shall be under 2 seconds on a mid-range Android phone on 4G. |

### 7.2 Security

| ID | Requirement |
|---|---|
| NFR-S-01 | All traffic in production shall be HTTPS. HTTP redirects to HTTPS. |
| NFR-S-02 | Passwords shall be bcrypt-hashed at cost ≥ 10 and never logged, returned, or emailed. |
| NFR-S-03 | Secrets shall come from environment variables. No secret is ever committed. |
| NFR-S-04 | Every request body, query string and path parameter shall be schema-validated before it reaches a service. |
| NFR-S-05 | Authentication endpoints shall be rate-limited to 5 attempts per minute per IP. |
| NFR-S-06 | Payment endpoints shall be rate-limited to 10 requests per minute per user. |
| NFR-S-07 | CORS shall allow only the known frontend origin. |
| NFR-S-08 | Error responses shall never include stack traces, SQL, or internal paths. |
| NFR-S-09 | The webhook endpoint shall reject any request whose Razorpay signature does not verify. |
| NFR-S-10 | Note HTML shall be sanitised server-side before storage and escaped client-side on render. |
| NFR-S-11 | Every authorisation decision — premium status, record ownership — shall be made on the server. The frontend's locked state is presentation only. |

### 7.3 Reliability

| ID | Requirement |
|---|---|
| NFR-R-01 | A student's saved mock-test answers shall survive a browser crash, refresh or network drop. |
| NFR-R-02 | A payment shall unlock the student even if the browser never returns from checkout, via the webhook. |
| NFR-R-03 | Payment writes shall be transactional — payment status and premium flag change together or not at all. |
| NFR-R-04 | The webhook shall be safe to receive any number of times for the same payment. |
| NFR-R-05 | `GET /health` shall report database connectivity, for uptime monitoring. |
| NFR-R-06 | The database shall be backed up daily with 7-day retention in production. |

### 7.4 Usability and compatibility

| ID | Requirement |
|---|---|
| NFR-U-01 | Every page shall be usable at 360 px width and above. |
| NFR-U-02 | The system shall work on current Chrome, Safari, Firefox and Edge, and on Android Chrome and iOS Safari. |
| NFR-U-03 | Every error shown to a student shall say what to do next, not just what went wrong. |
| NFR-U-04 | Any action taking over 500 ms shall show a loading state. |
| NFR-U-05 | The test-taking screen shall be operable by keyboard. |

### 7.5 Maintainability

| ID | Requirement |
|---|---|
| NFR-M-01 | The dependency direction `routes → services → dao → database` shall never be violated. No reverse or skipped imports. |
| NFR-M-02 | TypeScript shall run in `strict` mode. `any` requires a comment justifying it. |
| NFR-M-03 | Every service function containing branching logic shall have unit tests. |
| NFR-M-04 | Every endpoint shall have at least one integration test covering its success path and its main failure path. |
| NFR-M-05 | Payment verification and test scoring shall have full branch coverage. They are the two places a bug costs money or trust. |

---

## 8. Error model

Every error response uses one shape:

```json
{
  "error": {
    "code": "PAYMENT_REQUIRED",
    "message": "Unlock the course to access this content."
  }
}
```

| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body, query or params failed schema validation |
| 400 | `INVALID_SIGNATURE` | Razorpay signature did not verify |
| 401 | `UNAUTHENTICATED` | Missing, malformed or expired token |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password (identical for both) |
| 403 | `PAYMENT_REQUIRED` | Authenticated but not premium |
| 404 | `NOT_FOUND` | Does not exist, or is not yours |
| 409 | `EMAIL_TAKEN` | Signup with an existing email |
| 409 | `ALREADY_PREMIUM` | Premium user tried to pay again |
| 409 | `ALREADY_SUBMITTED` | Attempt submitted twice |
| 409 | `ATTEMPT_EXPIRED` | Action on an attempt past its expiry |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Anything unhandled. Details logged, never returned. |

**Rule:** "does not exist" and "exists but is not yours" both return `404`. Distinguishing them tells an attacker which record ids are real.

---

## 9. Acceptance criteria by phase

A phase is done only when every line is true.

**Phase 1 — Scaffold**
- [ ] `just dev` starts backend and frontend together.
- [ ] `GET /health` returns `200` and confirms the database connection.
- [ ] Migrations run from empty to current on a fresh database.
- [ ] TypeScript strict mode compiles clean on both sides.

**Phase 2 — Auth** *(FR-A-01 … FR-A-12)*
- [ ] Signup, login and `GET /me` work end to end.
- [ ] Password hashes only; no plaintext anywhere.
- [ ] Frontend route guarding sends logged-out visitors to `/login`.
- [ ] Session survives a browser restart.

**Phase 3 — Videos** *(FR-V-01 … FR-V-09)*
- [ ] Video list filters by subject.
- [ ] Playback works and seeking issues correct range requests.
- [ ] Files are on disk, metadata is in Postgres.

**Phase 4 — Notes** *(FR-N-01 … FR-N-10)*
- [ ] Notes read cleanly on phone and desktop.
- [ ] Selecting text saves a highlight with no save button.
- [ ] Highlights return on reload, on another device, and are private per user.

**Phase 5 — Mock tests** *(FR-T-01 … FR-T-20)*
- [ ] Full flow: start → answer → mark → submit → result.
- [ ] Refreshing mid-test loses nothing and does not reset the timer.
- [ ] Network inspection during a live test reveals no correct answers.
- [ ] Scoring matches NEET marking on a hand-checked sample.

**Phase 6 — Payments** *(FR-P-01 … FR-P-16)*
- [ ] Locked user sees titles and the unlock button; content returns `403`.
- [ ] Test-mode payment unlocks everything with no re-login.
- [ ] Tampered signature is rejected.
- [ ] Simulated webhook alone unlocks the user.
- [ ] Verify and webhook both firing produces one paid payment, not two.
- [ ] Changing the price row changes the checkout amount with no deploy.

**Phase 7 — Analytics** *(FR-G-01 … FR-G-05)*
- [ ] All eight events visible in GA4 DebugView.
- [ ] The signup → payment funnel is readable.
- [ ] No personal data in any payload.

---

## 10. Traceability

| PRD | SRS |
|---|---|
| PR-A1 … PR-A5 | FR-A-01 … FR-A-12 |
| PR-P1 … PR-P7 | FR-P-01 … FR-P-16 |
| PR-V1 … PR-V4 | FR-V-01 … FR-V-09 |
| PR-N1 … PR-N6 | FR-N-01 … FR-N-10 |
| PR-T1 … PR-T10 | FR-T-01 … FR-T-20 |
| PR-G1 … PR-G3 | FR-G-01 … FR-G-05 |

PRD items marked P1 are deliberately not specified here. They get their own SRS section when they are scheduled.
