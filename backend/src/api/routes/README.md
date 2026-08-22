# api/routes/

HTTP only: declare the schema, check auth, call one service method, return.

No business logic. No SQL. Guards attach per route:
`{ onRequest: [app.requireAuth] }` or `{ onRequest: [app.requirePremium] }`.
