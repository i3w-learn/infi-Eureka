# config/

Environment loading (`env.ts`) and the database connection pool (`db.ts`).

`db.ts` exposes `query`, `queryOne` and `transaction` — DAO files use those,
and nothing outside `dao/` should import this file.
