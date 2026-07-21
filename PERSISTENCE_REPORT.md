# Persistence Report — Integration Sprint 2

VOLT now remembers. This report documents exactly what that means: what
is durable, what is canonical, what technology backs it, and — just as
importantly — what still isn't durable yet, stated plainly rather than
implied away.

## Current persistence model

Before this sprint, nothing survived a backend restart. `src/api/server.ts`
constructed a brand-new, empty `World` in memory on every launch; every
trace ever committed was gone the moment the process stopped. The mobile
app's own local Entity/Relationship graph (`mobile/src/world/`) was
equally in-memory-only, and additionally was never durable across the app
being closed.

After this sprint:

- The **backend** persists its entire event log to SQLite and rebuilds
  its full World from that log on every startup. Committing a trace,
  restarting the process, and reading it back is a real, tested behavior
  now — not aspirational.
- The **mobile app's** local World is unchanged in durability — it is
  still in-memory-only, and that is now an explicit, documented design
  choice (it is a cache in front of the durable backend, not a second
  store that needed its own persistence) rather than an oversight.

## Chosen World implementation

Two World implementations existed going into this sprint: the backend's
original, narrow one (Trace entities only, two event types) and a
generic Entity/Relationship model built in `mobile/src/world/` during an
earlier sprint. Per Phase 2, exactly one had to become canonical.

**The generic Entity/Relationship model won**, for a reason stated in its
own prior documentation: it already listed "Trace" as one of its
registered entity types, meaning it was designed from the start as the
narrow model's successor, not a parallel alternative. Building durable
persistence for the narrow model would have meant persisting something
already earmarked for replacement; adopting the generic model as
canonical and persisting *that* does the real, permanent work once.

That model now lives at `src/world/canonical/` (project root, not inside
`mobile/`) — `Entity.ts`, `EntityTypes.ts`, `Relationship.ts`,
`WorldEvents.ts`, `WorldStore.ts`, `Queries.ts`, `WorldEngine.ts`, ported
essentially unchanged from the mobile original, with one real addition:
`WorldStore` was refactored so every mutation goes through one shared
`applyEvent` reducer, used identically by live mutation and by replay —
see "Event Sourcing" below.

The backend's original class, `World` (`src/world/World.ts`), is not
gone — it is now a **legacy-compatible adapter**. Its public contract
(`create`, `submit`, `history`, `view`, the exact `trace-N` id scheme,
the exact error messages) is preserved byte-for-byte, because
`src/api/app.ts` and the pre-existing `tests/world.test.ts` were both
written against it and neither needed to change. Underneath, it holds no
real state of its own — every fact lives in the canonical `WorldStore`,
reached through a `WorldEngine`; the adapter is bookkeeping and
translation only. The original implementation it used to contain was
moved, unchanged, to `src/world/legacy/TraceWorld.ts`, with a
deprecation banner, kept for historical reference and imported by
nothing.

One real bug was found and fixed while proving this end to end: the
adapter's `trace-N` id bookkeeping doesn't itself get persisted — it has
to be *reconstructed* by replaying the canonical engine's own event
history whenever a `World` is built around a restored engine. The
constructor does this now (`hydrateFromCanonicalHistory`). This was
caught by actually restarting a real server against a real database, not
by the unit tests alone — see "Known limitations" for what that implies
about test coverage in general.

## Database technology

**SQLite**, via Node's built-in `node:sqlite` module (`DatabaseSync`) —
no new dependency. Node 22+ ships this natively; it needed no native
build step in this environment, and there is no meaningful quality
difference between it and a third-party binding like `better-sqlite3` for
this project's scale. Nothing else production-quality already existed in
the project (confirmed by inspection: no ORM, no other DB client, no
existing schema anywhere), so per Phase 3's own instruction, SQLite is
the right and only reasonable choice.

`src/persistence/Database.ts` opens the database, enables foreign key
enforcement, and enables WAL mode for file-backed databases (a no-op,
correctly skipped, for the `:memory:` databases every test uses).

## Schema overview

One table: `world_events`. See `database/schema/schema.sql` for the
authoritative, hand-maintained snapshot, and
`database/migrations/0001_init.sql` for the migration that creates it.

```sql
CREATE TABLE world_events (
  sequence  INTEGER PRIMARY KEY,  -- WorldStore's own monotonic counter
  id        TEXT NOT NULL UNIQUE,
  type      TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  payload   TEXT NOT NULL          -- the full WorldEvent, JSON-encoded
);
```

There are deliberately **no** `entities`, `relationships`,
`conversations`, `messages`, `observations`, `insights`, or `suggestions`
tables. Per Phase 4, the event log is the single authoritative store, and
current state — every entity, every relationship, all of it — is a
projection derived from that log by `WorldStore.restore`, held in memory.
A second table holding "current state" would either have to be kept in
perfect lockstep with the log (pure redundancy) or would eventually drift
from it (a second source of truth, exactly what Phase 2 forbids). The
schema doc spells this out explicitly so a future contributor doesn't
"fix" the apparent gap by adding those tables back.

Conversation Threads, Messages, Observations, Insights, and Suggestions
are all representable and persisted through the *same* mechanism, not a
separate one: each is a registered `EntityType` (`Conversation` and
`Insight` already existed; `Message`, `Observation`, and `Suggestion`
were added to `src/world/canonical/EntityTypes.ts` for this sprint), and
their evidence trails use the existing `references` / `belongs_to`
relationship kinds. This is tested directly —
`tests/persistence/conversation.test.ts` and
`tests/persistence/proactiveArtifacts.test.ts` — without any bespoke
storage having been built for any of the five.

## Migration strategy

`database/migrations/NNNN_name.sql` files, applied in ascending numeric
order by `src/persistence/MigrationRunner.ts`. Applied versions are
recorded in a `schema_migrations` table (created by the runner itself,
not by a migration file, since a migration can't record its own
application before it exists). Running the migration step is safe and
cheap on every startup: already-applied versions are looked up and
skipped, never re-run, and each migration applies inside its own
transaction — a failure rolls back that migration cleanly rather than
leaving the schema half-changed.

`database/schema/schema.sql` is a hand-maintained, comment-annotated
snapshot of what the schema currently looks like — documentation for
humans, not something the application reads. It should be updated
alongside every new migration.

Adding a future migration is: add `database/migrations/0002_whatever.sql`,
done. No new tooling, no framework dependency.

## Remaining technical debt

- **Mobile's local World is not synced to the canonical backend store.**
  It mirrors backend Traces one-directionally (already true before this
  sprint) and tracks a local Conversation entity per session, but nothing
  it holds — Proactive Intelligence's Observations/Insights/Suggestions
  included — is sent to or persisted by the backend. The capability to
  persist them exists and is tested (see above); the wiring from mobile
  to actually call it does not exist yet. Building that wiring safely
  means designing a real sync protocol (what happens on conflict, what
  happens offline), which is a bigger decision than this sprint's mandate
  to "connect what exists."
- **`ReasoningEngine` still doesn't read from the World at all**,
  canonical or otherwise — flagged as future work by `src/intelligence/README.md`
  since Integration Sprint 1, still true.
- **No `entities` read-model table.** Every backend read replays the full
  event log into memory at startup, then serves from memory. At current
  and near-future scale (a personal life-graph, not a multi-tenant SaaS
  product) this is fast and simple. It stops being fine somewhere past
  "hundreds of thousands of events replayed on every restart" — see
  "Future scaling considerations."
- **The `hydrateFromCanonicalHistory` bug** (see above) was caught by
  manual end-to-end testing, not by the unit test suite, even though the
  suite that existed at the time passed completely. That is a real gap in
  what "tests pass" was proving before `tests/persistence/recovery.test.ts`
  existed — restart behavior specifically needs a test that spans two
  separate `recoverWorld()` calls against the same file, which is exactly
  what that file now does, but it's worth remembering that green unit
  tests alone did not catch this class of bug.

## Known limitations

- SQLite is a single-writer database. `node:sqlite`'s `DatabaseSync` is
  synchronous and blocks the Node event loop for the duration of each
  query — acceptable at this project's current request volume, not
  acceptable if the backend ever needs to serve meaningfully concurrent
  write traffic.
- `EventStore.append` prevents a duplicate `sequence` from being
  persisted twice, but nothing currently retries or queues a failed
  append — a caller that ignores the thrown `DuplicateEventError` (or any
  other write failure) has an event that happened in memory but not on
  disk, which a subsequent restart would silently lose. `WorldStore`
  itself doesn't roll back the in-memory mutation if the `onEvent`
  listener throws.
- Legacy history reconstruction (`hydrateFromCanonicalHistory`) cannot
  recover the original *author* of a weight-change event — that
  information was never part of the canonical `ENTITY_UPDATED` event to
  begin with (see `Entity.ts`'s `EntityOrigin`, which records who created
  an entity, not who patched it). Reconstructed `TRACE_WEIGHT_CHANGED`
  events default to `"human"`. This is a real, permanent information loss
  for data that predates this sprint's own bookkeeping, not a bug to fix
  later — it's a consequence of the original schema never having
  recorded it.

## Future scaling considerations

- **Move off full-log replay before it becomes a startup-latency
  problem.** The natural next step, when it matters, is a periodic
  snapshot of `WorldStore`'s projected state (entities + relationships)
  alongside the log, so startup replays only events since the last
  snapshot instead of the entire history. The event log stays
  authoritative either way — a snapshot is a derived optimization, never
  a second source of truth, consistent with Phase 4's constraint.
- **Move off `DatabaseSync` to an async/worker-thread SQLite binding (or
  a networked database) if concurrent write load ever appears.** Nothing
  in `EventStore`'s interface (`append`, `loadAll`, `count`) is
  SQLite-specific in its shape; swapping the implementation behind it is
  a contained change.
- **The mobile-to-backend sync gap is the highest-leverage next piece of
  real work.** Once it exists, Proactive Intelligence stops reasoning
  over a single session's local cache and starts reasoning over the same
  durable graph the backend has — which is what makes "notices a pattern
  across weeks of committed traces," not just "within one open app
  session," actually possible.
