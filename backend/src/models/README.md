# models/

The shape of a database row, as a TypeScript type — one file per table
(`user.model.ts`, `video.model.ts`, `attempt.model.ts`, ...).

Types only. No logic, no SQL, no validation.

Keep these separate from `types/`: a model is what the **database** stores,
a type in `types/` is what goes **over the wire** to the client. They drift
apart on purpose — `UserModel` has `passwordHash`, `PublicUser` never does.
