# services/

Business rules. One class per feature, dependencies taken through the
constructor and typed as interfaces (see `health.service.ts` for the pattern).

Allowed: calling DAOs, calling other services, making decisions.
Not allowed: SQL, HTTP status codes, reading `request`/`reply`.
