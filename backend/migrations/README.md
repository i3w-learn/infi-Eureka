# migrations/

Database schema changes. Files live in `versions/`, run in filename order, and
are tracked in the `pgmigrations` table so each runs exactly once.

```bash
just migration add_videos_table   # creates versions/<n>_add_videos_table.sql
just migrate                      # apply pending migrations to the dev database
just migrate-test                 # same, against the test database
```

## Forward-only

Migrations are **forward-only** (SRS DR-08). To undo a change, write a new
migration that reverses it — never edit or roll back an applied one.

The reason: once a migration has run on another machine or in production,
rolling it back locally puts the two databases into different states with no
record of the difference. A new forward migration keeps every environment on
the same, replayable history.

Each file still carries a `-- Down Migration` section, because the tool expects
one and it documents how the change would be reversed. It is not part of the
normal workflow.

```sql
-- Up Migration
CREATE TABLE videos (...);

-- Down Migration
DROP TABLE videos;
```

## Rules

- **Never edit a migration that has already run** anywhere — write a new one.
- Keep `README.md` out of `versions/`; every file in there needs a numeric
  prefix or the migration tool refuses to start.
- This is the only place `CREATE`/`ALTER TABLE` appears. Query SQL lives in
  `src/dao/postgres/`.
