# dao/

Data access. **Every line of SQL in this codebase lives under `postgres/`.**

- `interfaces/` — the contract a service depends on (`IUserDao`)
- `postgres/`   — the Postgres implementation of that contract (`UserDao`)

Services import from `interfaces/` only. The two are bound together in
`src/container.ts` and nowhere else — that is what makes the database
swappable and the services testable.

A DAO never imports a service.
