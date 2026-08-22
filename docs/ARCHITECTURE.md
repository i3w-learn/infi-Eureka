# Architecture

How this codebase is organised, and the rules that keep it that way.

## The one rule

```
routes → services → dao → database
```

Strictly one direction. Nothing imports upward.

| Layer | Owns | Never does |
|-------|------|------------|
| `api/routes/` | HTTP: schemas, status codes, auth guards | business logic, SQL |
| `services/` | business rules, orchestration | SQL, HTTP concerns |
| `dao/` | queries, transactions | business decisions |
| `models/` | database row shapes | logic |
| `types/` | API contracts (what goes over the wire) | database shapes |
| `integrations/` | third-party clients, wrapped | leaking vendor SDK types upward |

Two quick tests for whether code is in the right place:

- Searching for `SELECT` should only ever hit `dao/postgres/` and `migrations/`.
- A service file should never mention `request`, `reply`, or a status code.

## SOLID, concretely

Rather than a checklist, here is what each letter actually means in this repo.

**Single responsibility.** Each layer has one job, and each file within it
covers one feature. A route file does HTTP. A service decides. A DAO fetches.
When a file starts doing two of those, split it.

**Open/closed.** Adding a feature means adding files, not editing existing
ones. A new feature adds `x-route.ts`, `x-service.ts`, `IXDao` + `XDao`, and
touches exactly two existing files: one line in `api/routes/index.ts` and one
binding in `container.ts`.

**Liskov substitution.** Any class implementing `IUserDao` can replace any
other — the Postgres one in production, a fake in tests — and callers cannot
tell. That only holds if implementations keep the contract: same return shapes,
same error types, no extra surprises.

**Interface segregation.** Interfaces stay small and per-feature (`IUserDao`,
`IVideoDao`), never one fat `IDatabase` that every service depends on. A
service should not have to know about methods it never calls.

**Dependency inversion.** This is the important one. Services depend on
interfaces in `dao/interfaces/`, never on the concrete class:

```ts
// services/health-service.ts
export class HealthService {
  constructor(private readonly healthDao: IHealthDao) {}   // an interface
}
```

Concrete classes are attached to interfaces in exactly one file:

```ts
// container.ts — the composition root
const healthDao = new HealthDao();                          // the real one
export const container = { healthService: new HealthService(healthDao) };
```

Two things fall out of this for free:

1. **Tests need no database.** Pass a fake DAO to the constructor — see
   `tests/unit/health-service.test.ts`.
2. **The database is swappable.** Adding `dao/mysql/` and changing one line in
   `container.ts` would be the whole migration. No service changes.

## Walking one request end to end

`GET /api/v1/health` is the reference example — read these five files in order and
you have seen the entire pattern:

1. `api/routes/health-route.ts` — declares the endpoint and response schema
2. `container.ts` — hands the service its DAO
3. `services/health-service.ts` — the decision (ok or degraded?)
4. `dao/interfaces/health-dao.interface.ts` — the contract
5. `dao/postgres/health-dao.ts` — the SQL

Every feature after this is the same five files with a different name.

## Adding a feature: the checklist

Say you are adding videos.

1. `migrations/versions/` — `just migration add_videos_table`, write the SQL
2. `models/video.ts` — the row shape
3. `types/video-schemas.ts` — request and response JSON Schemas
4. `dao/interfaces/video-dao.interface.ts` — `IVideoDao`
5. `dao/postgres/video-dao.ts` — implements it, holds the SQL
6. `services/video-service.ts` — takes `IVideoDao` in the constructor
7. `container.ts` — bind them together (one line)
8. `api/routes/video-route.ts` — endpoints, guarded with `app.requirePremium`
9. `api/routes/index.ts` — register the route group (one line)
10. `tests/unit/video-service.test.ts` — test the service with a fake DAO

For the full worked example with code, see `DEVELOPMENT.md` §6.

## Security rules that are not negotiable

These exist because getting them wrong costs real money or real trust.

- **Passwords** are hashed with bcrypt. Never stored or logged in plain text.
- **Prices** come from the `plans` table on the backend. The frontend never
  sends an amount — otherwise anyone can edit the page and pay ₹1.
- **Payments** are confirmed by verifying Razorpay's signature server-side, plus
  a webhook as backup. A "success" message from the browser proves nothing.
- **Correct answers** for mock tests never leave the backend during a test.
  Scoring happens server-side.
- **Locking** is enforced by `app.requirePremium` on the route, which re-reads
  `users.is_premium` from the database on every request rather than trusting the
  token. Premium in the JWT would mean a student who just paid stays locked out
  until their token expires, and revoking access would need every session
  invalidated. `tests/integration/auth-guard.test.ts` pins this behaviour.
- **The catalogue is not the content.** Listing videos, notes and tests needs
  only a login, so an unpaid student can browse what they would get. Only
  opening an item requires payment.
- **The frontend's locked-looking UI is a convenience, not a security control.**
- **Secrets** (`JWT_SECRET`, Razorpay secret key) live in `.env`, which is
  gitignored. Only `VITE_`-prefixed values reach the browser, so never put a
  secret behind that prefix.

## Frontend structure

```
src/
├── api/         # one file per feature; the only place fetch() is called
├── pages/       # one file per screen
├── components/  # shared UI, including route guards
├── hooks/       # shared state (useAuth)
├── analytics/   # GA4 wrapper — the app never calls gtag directly
├── lib/         # small shared helpers
└── styles/
```

Same idea as the backend: pages call `api/`, never `fetch` directly, so
endpoints and error handling live in one place.

Routes are grouped by who may enter: public, `RequireAuth` (logged in), and
`RequirePremium` (logged in and paid) — see `App.tsx`. Note the catalogues sit
in the `RequireAuth` group, not `RequirePremium`, so unpaid students can browse.
