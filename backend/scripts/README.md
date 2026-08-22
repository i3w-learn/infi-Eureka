# scripts/

One-off and maintenance scripts run by hand, not by the server.

Examples this project will need: seeding videos/notes/questions from a file,
backfilling a column after a migration, granting a user premium access manually.

Scripts import services from `src/` — they never talk to the database directly,
so the same business rules apply whether a request or a script triggers them.
