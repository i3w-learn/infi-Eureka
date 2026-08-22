# infi-Eureka — Development Guide

**Version:** 1.0
**Date:** 2026-08-21

How to set the project up, how to work on it, and the rules that keep it consistent. Read `docs/ARCHITECTURE.md` first if you have not — this document assumes you know the layer rule.

---

## 1. What you need installed

| Tool | Version | Why |
|---|---|---|
| Node.js | 20 LTS or newer | Runs backend and frontend tooling |
| pnpm | 9+ | Package manager (npm works, pnpm is faster) |
| PostgreSQL | 16+ | The database. Docker is fine. |
| just | any | Task runner — `just dev`, `just test` |
| Docker | optional | Easiest way to get Postgres running |

```bash
# macOS
brew install node pnpm postgresql@16 just
brew services start postgresql@16

# or just the database, in Docker
docker run --name eureka-db -e POSTGRES_PASSWORD=eureka \
  -p 5432:5432 -d postgres:16
```

---

## 2. First-time setup

```bash
git clone <repo> infi-Eureka
cd infi-Eureka

# backend
cd backend
pnpm install
cp .env.example .env          # then fill it in — see §3
createdb eureka_dev           # skip if using Docker
pnpm migrate:up
pnpm seed                     # sample plan, videos, notes, one test

# frontend
cd ../frontend
pnpm install
cp .env.example .env

# run both
cd ..
just dev
```

You should now have:

- API on `http://localhost:3000` — check `http://localhost:3000/api/v1/health`
- App on `http://localhost:5173`

If health returns `200` with `"database": "ok"`, you are set up correctly.

---

## 3. Environment variables

### `backend/.env`

```ini
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

DATABASE_URL=postgresql://postgres:eureka@localhost:5432/eureka_dev

# openssl rand -base64 32
JWT_SECRET=replace-me
JWT_EXPIRES_IN=7d

# https://dashboard.razorpay.com — test keys are fine for development
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxx

STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=./storage

CORS_ORIGIN=http://localhost:5173
```

### `frontend/.env`

```ini
VITE_API_URL=http://localhost:3000/api/v1
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

> **Two hard rules.**
> 1. `.env` is in `.gitignore` and stays there. `.env.example` is committed with placeholder values only.
> 2. Anything prefixed `VITE_` is compiled into the JavaScript the browser downloads — it is **public**. `RAZORPAY_KEY_SECRET` and `JWT_SECRET` must never appear in a frontend file. The key *id* is meant to be public; the key *secret* is what makes signature verification meaningful, and leaking it breaks the entire payment system.

The backend validates its config on boot and refuses to start if something required is missing. Failing loudly at startup beats failing mysteriously at 2am.

---

## 4. Repository layout

```
infi-Eureka/
├── backend/
│   ├── src/
│   │   ├── api/routes/       # HTTP only: auth, videos, notes, tests, payments
│   │   ├── services/         # all business logic
│   │   ├── dao/              # every SQL statement in the project
│   │   │   ├── interfaces/   #   the contract a service depends on (IVideoDao)
│   │   │   └── postgres/     #   the Postgres implementation (VideoDao)
│   │   ├── models/           # row types matching the tables
│   │   ├── types/            # Fastify JSON Schemas for requests + responses
│   │   ├── config/           # env parsing, db pool
│   │   ├── exceptions/       # AppError and its subclasses
│   │   ├── integrations/     # razorpay/, storage/ — same interface split as dao/
│   │   ├── middleware/       # requireAuth, requirePremium, rate limits
│   │   ├── utils/
│   │   └── container.ts      # composition root: binds interfaces to classes
│   ├── migrations/versions/  # 0001_users.sql, 0002_plans.sql, ...
│   ├── seeds/
│   └── tests/
│       ├── unit/             # services, pure functions — no DB
│       └── integration/      # real routes against a test database
├── frontend/
│   └── src/
│       ├── pages/            # Login, Signup, Dashboard, Videos, Notes, MockTest, Results
│       ├── components/
│       ├── api/              # one file per backend area
│       ├── hooks/
│       ├── analytics/        # GA4 setup + typed event helpers
│       └── lib/
├── docs/
└── justfile
```

---

## 5. The rules

### 5.1 The layer rule

```
routes → services → dao → database
```

One direction. Never backwards, never skipping.

**Allowed:** a route imports a service. A service imports a DAO. A service imports an integration.
**Not allowed:** a route imports a DAO. A service imports anything from `api/`. A DAO imports a service. SQL anywhere outside `dao/`.

If you find yourself wanting to break this, the design is wrong somewhere else. Fix that instead.

### 5.2 Non-negotiables

| Rule | Why |
|---|---|
| No SQL outside `src/dao/`. | One folder to audit for injection, one place to tune. |
| Every query is parameterised — `$1`, never string concatenation. | SQL injection. No exceptions, not even for "safe" values. |
| Every route declares a request **and** a response schema. | Requests get validated; responses get stripped. The response schema is what stops mock-test answers leaking. |
| TypeScript `strict` is on. An `any` needs a comment explaining itself. | The types are the cheapest tests you will ever get. |
| Errors are thrown as `AppError` subclasses; one handler turns them into HTTP. | Every error looks the same to the client, and no stack trace ever escapes. |
| Money is `BIGINT` paise everywhere, end to end. | Floats lose rupees. Convert to "₹3,499" only for display. |
| Time is UTC in the database, formatted at render. | Servers and students will not always share a timezone. |
| Nothing secret is ever logged. | Passwords, tokens, key secrets. Log ids, not payloads. |

### 5.3 Naming

| Thing | Style | Example |
|---|---|---|
| Files | kebab-case | `attempt-service.ts` |
| Tables and columns | snake_case, tables plural | `attempt_answers.chosen_option` |
| TypeScript variables and functions | camelCase | `calculateScore` |
| Types and classes | PascalCase | `AttemptResult` |
| Constants | SCREAMING_SNAKE | `MAX_LOGIN_ATTEMPTS` |
| React components | PascalCase files | `QuestionPalette.tsx` |
| API paths | plural, kebab-case | `/attempts/:id/answers` |

The database is snake_case, the TypeScript is camelCase, and the DAO layer is the only place that translates between them. Everything above `dao/` sees camelCase and never thinks about it.

---

## 6. Adding a feature, end to end

A worked example: **"let a student flag a question for review."**

**1. Migration** — `migrations/versions/0012_review_flag.sql`

```sql
ALTER TABLE attempt_answers
  ADD COLUMN marked_for_review BOOLEAN NOT NULL DEFAULT FALSE;
```

```bash
pnpm migrate:up
```

**2. Model** — `src/models/attempt-answer.ts`

```ts
export interface AttemptAnswer {
  id: number
  attemptId: number
  questionId: number
  chosenOption: 'A' | 'B' | 'C' | 'D' | null
  markedForReview: boolean
  updatedAt: Date
}
```

**3. Schema** — `src/types/attempt-schemas.ts`

```ts
export const saveAnswerSchema = {
  body: {
    type: 'object',
    required: ['questionId'],
    additionalProperties: false,
    properties: {
      questionId:      { type: 'integer', minimum: 1 },
      chosenOption:    { type: ['string', 'null'], enum: ['A','B','C','D', null] },
      markedForReview: { type: 'boolean' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: { saved: { type: 'boolean' } },
    },
  },
} as const
```

`additionalProperties: false` matters: it means an unexpected field is a `400`, not something silently ignored.

**4a. DAO contract** — `src/dao/interfaces/attempt-answers-dao.interface.ts`

This is what the service will depend on. It says what we need, not how it is stored.

```ts
export interface IAttemptAnswersDao {
  upsertAnswer(input: {
    attemptId: number
    questionId: number
    chosenOption: 'A' | 'B' | 'C' | 'D' | null
    markedForReview: boolean
  }): Promise<void>
}
```

**4b. DAO implementation** — `src/dao/postgres/attempt-answers-dao.ts`. SQL only, no decisions.

```ts
import { query } from '../../config/db.js'

export class AttemptAnswersDao implements IAttemptAnswersDao {
  async upsertAnswer(input: UpsertAnswerInput): Promise<void> {
    await query(
      `INSERT INTO attempt_answers
         (attempt_id, question_id, chosen_option, marked_for_review)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (attempt_id, question_id) DO UPDATE
         SET chosen_option     = EXCLUDED.chosen_option,
             marked_for_review = EXCLUDED.marked_for_review,
             updated_at        = now()`,
      [input.attemptId, input.questionId, input.chosenOption, input.markedForReview],
    )
  }
}
```

**5. Service** — `src/services/attempt-service.ts`. All the decisions live here.

Dependencies arrive through the constructor, typed as interfaces. The service
never imports a concrete DAO.

```ts
export class AttemptService {
  constructor(
    private readonly attemptsDao: IAttemptsDao,
    private readonly attemptAnswersDao: IAttemptAnswersDao,
  ) {}

  async saveAnswer(userId: number, attemptId: number, input: SaveAnswerInput): Promise<void> {
    const attempt = await this.attemptsDao.findByIdForUser(attemptId, userId)
    if (!attempt) throw new NotFoundError('Attempt not found')
    if (attempt.status !== 'in_progress') throw new AlreadySubmittedError()
    if (new Date() > attempt.expiresAt) throw new AttemptExpiredError()

    await this.attemptAnswersDao.upsertAnswer({
      attemptId,
      questionId: input.questionId,
      chosenOption: input.chosenOption ?? null,
      markedForReview: input.markedForReview ?? false,
    })
  }
}
```

Notice `findByIdForUser` — ownership is a `WHERE user_id = $2` in the query, not a check afterwards. A record you do not own simply does not come back, which is also why this returns `404` and not `403`.

**6. Wire it up** — `src/container.ts`. One line, and this is the only file that knows which implementation is real.

```ts
const attemptsDao = new AttemptsDao()
const attemptAnswersDao = new AttemptAnswersDao()

return {
  attemptService: new AttemptService(attemptsDao, attemptAnswersDao),
}
```

**7. Route** — `src/api/routes/attempt-route.ts`. Thin. It plumbs.

```ts
app.put('/attempts/:id/answers', {
  schema: saveAnswerSchema,
  onRequest: [app.requirePremium],
}, async (req) => {
  await container.attemptService.saveAnswer(req.user.sub, Number(req.params.id), req.body)
  return { saved: true }
})
```

`app.requirePremium` re-reads payment status from the database on every request, so a student who just paid gets in without logging out and back in.

**8. Tests**

```ts
// tests/unit/attempt-service.test.ts — no HTTP, no database, no mocking library
class FakeAttemptsDao implements IAttemptsDao {
  constructor(private readonly attempt: Attempt | null) {}
  async findByIdForUser() { return this.attempt }
}

it('rejects an answer after the attempt expires', async () => {
  const service = new AttemptService(
    new FakeAttemptsDao({ status: 'in_progress', expiresAt: yesterday }),
    new FakeAttemptAnswersDao(),
  )
  await expect(service.saveAnswer(1, 1, { questionId: 3, chosenOption: 'B' }))
    .rejects.toThrow(AttemptExpiredError)
})

// tests/integration/attempts.test.ts — real route, real test database
it('saves and returns the flag on the attempt state', async () => {
  const res = await app.inject({
    method: 'PUT', url: `/api/v1/attempts/${id}/answers`,
    headers: { authorization: `Bearer ${token}` },
    payload: { questionId: 3, markedForReview: true },
  })
  expect(res.statusCode).toBe(200)
})
```

**9. Frontend** — add the call in `src/api/attempts.ts`, then use it from the component. Never call `fetch` directly from a component; the `api/` folder is where the base URL, the auth header and error handling live in one place.

Several files for one boolean. That is the layer rule's cost, and it is the same files in the same order every time — which is exactly the point. Nobody has to decide where anything goes.

The interface-plus-constructor step is what makes the unit test above possible: no database, no mocking library, just a fake class. It is also what would let us change database without touching a single service.

---

## 7. Migrations

Numbered, forward-only, never edited once merged.

```bash
pnpm migrate:new add_review_flag   # creates 00NN_add_review_flag.sql
pnpm migrate:up                    # apply pending
pnpm migrate:status                # what has run
```

**Rules**

- One logical change per file.
- Never edit a migration that is already on `main` — someone else has run it, and their database will not match yours. Write a new one.
- Every migration must run cleanly on an empty database. `just db-reset` proves it.
- Adding a `NOT NULL` column to a table with rows needs a `DEFAULT`, or it fails.
- Migrations run before the new code starts, so the schema is always ahead of the code, never behind.

---

## 8. Testing

```bash
just test              # everything
just test-unit         # fast, no database
just test-integration  # real routes, test database
just test-watch
```

**Unit tests** cover services and pure functions. No HTTP, no database. These should run in under a second so you actually run them.

**Integration tests** run real routes against a real test database, wiped between tests.

**What must be tested, without argument:**

- Payment signature verification — valid, tampered, replayed
- Payment idempotency — verify and webhook, in both orders, repeatedly
- Test scoring — every combination of correct, wrong and unattempted
- Attempt expiry — saves and submits rejected after the deadline
- Premium gating — every gated route returns `403` for a locked user
- Ownership — one user cannot read or delete another's highlights or attempts
- Answer-key leakage — assert that no live-attempt response contains `correct_option`

Those are the places where a bug costs money or trust. Everything else is judgement.

---

## 9. Seeding content

Until there is an admin panel (open decision #2), content goes in through seed files.

```
backend/seeds/
├── 001_plans.sql       # ₹6,000 MRP, ₹3,499 price
├── 002_videos.sql
├── 003_notes.sql
└── 004_tests.sql       # a test and its questions
```

```bash
pnpm seed          # apply all
pnpm seed:reset    # wipe content tables and re-apply
```

Seeds never touch `users` or `payments`. Real accounts and real money records are not test data.

To make a local account premium without paying:

```sql
UPDATE users SET is_premium = true WHERE email = 'you@example.com';
```

Development only, obviously.

---

## 10. Git workflow

```bash
git checkout -b feat/mock-test-timer
# ... work ...
just check                    # lint + typecheck + test
git add -A
git commit -m "feat(tests): server-authoritative attempt timer"
git pull                      # rebase or merge, resolve conflicts properly
git push -u origin feat/mock-test-timer
```

**Never force-push.** Pull, resolve conflicts, push. A force-push can erase a collaborator's work permanently, and no convenience is worth that.

Branch names: `feat/`, `fix/`, `chore/`, `docs/`.
Commit messages: `type(scope): what changed`, imperative mood.

**Before opening a PR**

- [ ] `just check` passes
- [ ] Migrations run on a fresh database (`just db-reset`)
- [ ] New endpoints have request and response schemas
- [ ] No secrets in the diff
- [ ] No SQL outside `dao/`
- [ ] Tests cover the failure path, not only the happy path

---

## 11. Build order

Each phase ends with something that works. Do not start the next one until the current phase's acceptance criteria in `docs/SRS.md` §9 are all ticked.

| Phase | What | Depends on | Blocked by |
|---|---|---|---|
| 1 | Scaffold, database, health check | — | — |
| 2 | Auth: signup, login, `/me`, route guarding | 1 | — |
| 3 | Videos: upload, list, range streaming, player | 2 | — |
| 4 | Notes and highlights | 2 | Open decision #1 (rich text vs PDF) |
| 5 | CBT mock tests | 2 | — |
| 6 | Razorpay payments and the premium gate | 2, and something worth paying for | Razorpay keys |
| 7 | GA4 analytics | 2–6 | GA4 measurement ID |

**Why payments come sixth, not second.** Phase 6 is one middleware and one payment flow — it bolts onto finished features in a couple of days. Building the lock before there is anything behind it means you spend that time unable to test whether the thing you are selling is any good. Build the value, then charge for it.

**One thing to get right early, in Phase 2:** the premium check reads from the database, not from the JWT. If it is baked into the token, a student who pays stays locked until their token expires. Decide this now; retrofitting it later means invalidating every live session.

---

## 12. Common commands

```bash
just dev              # backend + frontend together
just dev-backend
just dev-frontend

just migrate          # apply pending migrations
just db-reset         # drop, recreate, migrate, seed — the clean-slate button
just seed

just check            # lint + typecheck + test — run before every push
just lint
just typecheck
just test

just build            # production build, both sides
```

---

## 13. When something is wrong

| Symptom | Likely cause |
|---|---|
| `ECONNREFUSED` on startup | Postgres is not running, or `DATABASE_URL` is wrong. |
| Health check says `"database": "error"` | Database is up but the credentials or database name are wrong. |
| `401` on every request after login | Token not attached. Check the `Authorization: Bearer` header in `src/api/`. |
| `403 PAYMENT_REQUIRED` while testing | Your dev user is not premium. Run the `UPDATE` in §9. |
| CORS error in the browser console | `CORS_ORIGIN` in `backend/.env` does not match the frontend's actual origin. |
| Razorpay checkout will not open | `VITE_RAZORPAY_KEY_ID` missing, or you used the secret instead of the id. |
| Webhook never arrives locally | Razorpay cannot reach `localhost`. Use `ngrok` and register the public URL in the Razorpay dashboard. |
| Video plays but seeking does nothing | Range requests not implemented — the endpoint is returning `200` with the whole file instead of `206` with a `Content-Range` header. |
| Migration fails on a fresh database but works locally | You edited an already-applied migration. Write a new one instead. |
| Timer resets on refresh | The countdown is being seeded from client state. It must come from the server's `seconds_remaining`. |

---

## 14. Related documents

- `docs/PRD.md` — what and why
- `docs/SRS.md` — numbered requirements and acceptance criteria
- `docs/ARCHITECTURE.md` — how it fits together, and the reasoning
- `docs/PLAN.md` — the original phase plan
