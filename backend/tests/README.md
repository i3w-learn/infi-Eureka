# tests/

```
unit/          services tested with fake DAOs — no database, fast
integration/   real HTTP requests against a real database
setup.ts       points every test at TEST_DATABASE_URL
```

## Unit tests

Construct the service with a fake DAO and assert on what it returns. See
`unit/health-service.test.ts` — that is the shape every service test follows.
This is what constructor injection buys us: no database, no mocking library.

## Integration tests

Build the app with `buildApp()` and use `app.inject()` to make real requests
without opening a port. See `integration/auth-guard.test.ts`.

They run against `TEST_DATABASE_URL`, never the development database —
`setup.ts` overrides the connection string before anything opens a pool. Run
`just migrate-test` once after adding a migration.

Each test cleans up the rows it created, and files run one at a time
(`fileParallelism: false`) so two tests cannot fight over the same table.

## What must have an integration test

These are the places where a bug costs money or leaks answers:

- Razorpay signature verification, including a tampered payload
- Paying twice does not double-charge or double-unlock
- Mock test scoring, including unanswered questions
- An attempt submitted after time is up
- Locked users are refused on every premium route
- A user cannot read another user's attempt, result or highlights
- Correct answers never appear in any response during a test
