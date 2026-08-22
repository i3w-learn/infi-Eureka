# seeds/

Content loaded into the database: the pricing plan, videos, notes, mock tests
and their questions. For v1 this is the only way content gets in — there is no
admin panel.

Files run in filename order (`npm run seed`):

```
001_plans.sql      the ₹6,000 → ₹3,499 plan
002_videos.sql     one-shot video catalogue
003_notes.sql      notes
004_tests.sql      mock tests and their questions
```

**Seeds must be safe to run twice.** Use `ON CONFLICT DO NOTHING` (or a fixed
primary key with `ON CONFLICT ... DO UPDATE`) rather than a plain `INSERT`, so
re-seeding a populated database updates it instead of failing halfway.

Each file runs inside its own transaction — a broken file rolls back cleanly
rather than leaving half its rows behind.

To wipe and rebuild everything from scratch: `npm run db:reset`.
