# The Living World

This module is VOLT's world model: a generic graph of typed, related
entities capable of representing everything a life is made of — not just
the Traces the product started with, but the humans, conversations,
memories, missions, habits, workouts, journal entries, emotions, and
everything else a person's life touches.

> **Status (Integration Sprint 2 — read this one first):** this module is
> no longer the canonical World. As of Integration Sprint 2, the same
> generic Entity/Relationship design described below was ported into the
> **backend** (`src/world/canonical/` at the project root, not inside
> `mobile/`), given a durable SQLite-backed event log, and made the
> project's single source of truth — see `/PERSISTENCE_REPORT.md` at the
> project root for the full rationale.
>
> This copy — the one in `mobile/src/world/` — is now correctly understood
> as a **local, ephemeral, client-side cache**, not a second competing
> World. It still mirrors backend Traces (`useTraces.ts`) and still tracks
> a Conversation entity per session for Proactive Intelligence to reason
> over locally (`ConversationMode.tsx`), but nothing it holds durably
> outlives the app process, and it is never treated as authoritative when
> it and the backend could disagree — the backend always wins, because the
> backend is the only one with a memory longer than one session. Wiring
> this cache to actually sync with the canonical backend store (rather
> than one-directionally mirroring Traces alone) is documented as
> remaining work in `/PERSISTENCE_REPORT.md`, not attempted this sprint —
> doing it safely means designing a real sync protocol, which is a bigger
> decision than "connect what already exists."
>
> *(The note below, from Integration Sprint 1, is kept for history — at
> that point this module genuinely was the only place this design lived.)*

> **Status (Integration Sprint 1):** connected. `useTraces.ts` mirrors
> every backend Trace into `worldEngine` (the shared singleton exported
> from `WorldEngine.ts`), and `ConversationMode.tsx` creates/updates a
> Conversation entity around each exchange. `ReasoningEngine` still does
> not read from or write to the World directly — that specific
> integration, called out below as future work at the time this was
> written, remains future work.

## Scope of this sprint

- **Pure architecture.** Every file here is a real, working
  implementation — you can construct a `World`, create entities, relate
  them, and query the graph today — but nothing in the running app calls
  into this module yet.
- **No UI change.** Nothing under `src/modes`, `src/components`, or
  `src/core` was touched.
- **No API change.** This module does not call the backend and the
  backend was not modified. It is a standalone, in-memory model.
- **Independent of the Intelligence Engine.** `src/intelligence/` and
  `src/world/` do not import each other. The natural integration —
  `ReasoningEngine` reading from and writing to a `WorldEngine` instead of
  (or alongside) the mock provider — is future work, not this sprint's.

### A naming note, so nobody goes looking in the wrong place

The repository root also has a `src/world/World.ts` — that one is the
backend's event-sourced Trace store (`GET /world`, `POST /trace`), a
different, older, much smaller system this module does not depend on,
does not import, and is not a replacement for. This module lives entirely
under `mobile/src/world/`. The two are unrelated except for sharing a
name and a taste for event sourcing, which was a coincidence worth this
paragraph so it doesn't become a confusing one.

## The core idea: everything is an Entity

VOLT used to have one kind of thing: a Trace. The Living World replaces
"one kind of thing" with **one shape, many kinds of thing**. A Human, an
Emotion, a Book, a Habit, and a JournalEntry are all, structurally, the
same object — an `Entity` — distinguished only by their `type` and by the
convention (documented, not enforced) of what lives in their
`attributes`. See `Entity.ts` for the full shape; in short, every entity
carries an id, its type, timestamps, a loosely-typed attribute bag, the
IDs of every relationship touching it, a visibility level, a confidence
score, and a record of where it came from.

This is what makes the World generic rather than a fixed schema with 21
tables bolted together. Adding "Habit" as a concept required zero new
code beyond registering the type and agreeing on a couple of attribute
names (`title`, `cadence`) — see `EntityTypes.ts`.

### Why 21 types aren't a closed union

`EntityType` is a plain string, not a TypeScript union of exactly 21
literals. `EntityTypes.ts` seeds a registry with descriptors for the 21
types this sprint names, and exposes `registerEntityType()` so a future
module — a habit tracker, a reading tracker, anything not yet imagined —
can add its own type without recompiling this one. `BuiltInEntityType` is
still exported as a literal union purely so editors can autocomplete the
21 known types; it is documentation, not a boundary.

`RelationshipKind` (in `Relationship.ts`) follows the identical pattern
for the same reason: a graph meant to hold a life will always need a verb
nobody thought of yet.

## Entities relate to entities: the Relationship graph

Any entity can relate to any other entity, through a directed, typed,
weighted edge (`Relationship.ts`). Direction matters — "caused_by" and
"evolved_into" are not meaningful read backwards — so every relationship
has a `fromId` and a `toId`, never an unordered pair. Strength (0 to 1) is
what makes "strongest connected entities" a real query instead of an
arbitrary one: not every edge in a life means the same amount.

### Why "Relationship" means two different things on purpose

This module uses the word "Relationship" for two distinct concepts, and
that is intentional, not an oversight:

1. **`Relationship` the entity type** (`EntityTypes.ts`) — an
   interpersonal relationship as something the user can hold as a subject
   in its own right: "my relationship with my brother," something that
   can be journaled about, referenced by a JournalEntry, and watched
   evolve over time via `evolved_into` edges.
2. **`Relationship` the edge** (`Relationship.ts`) — the structural link
   connecting any two entities of any type, the thing this whole section
   is about.

A real life needs both meanings, and collapsing them into one concept
would lose something: the *fact* that the user has a relationship with
their brother is itself an entity that can be created, related to, and
reasoned about — while the countless structural links throughout the rest
of the graph (a JournalEntry `mentions` a Human, a Decision `caused_by` a
Conversation) are a different, more numerous, more mechanical kind of
thing. English uses one word for both ideas. So does this module. Anyone
extending it should keep them just as clearly separated as this document
does: a `Relationship` *entity* has an `id`, a `type` of `"Relationship"`,
and attributes like `withEntityId`; a `Relationship` *edge* has a `kind`,
a `fromId`, and a `toId`, and never appears as a node you could point a
query at with `getEntity()`.

## Why the World is event-sourced

`Events.ts` defines `WorldEvent`, and `World.ts` never mutates state
without first appending the event that justifies the mutation. Three
reasons this matters specifically for a life-graph, not just as general
good practice:

- **Nothing about a life should be silently overwritten.** An "update" is
  a new fact laid over old ones. The log keeps both, forever — updating
  an entity's attributes doesn't erase what it used to say, even though
  `World.getEntity()` only ever shows you the current version.
- **Temporal queries need a timeline, not a snapshot.** "Find recent
  emotional changes" (`findRecentEmotionalChanges` in `Queries.ts`) is
  impossible to answer from current state alone — current state can only
  say what an Emotion *is*, never when it last changed. The event log
  makes the question answerable by construction.
- **The log is the foundation for everything this module doesn't do yet.**
  Undo, multi-device sync, an audit trail of what an AI provider changed
  and when — all of these are "replay or diff the log," not new
  infrastructure, the moment they're needed.

"Deleting" an entity in this World means `archiveEntity()`, which sets
`archivedAt` and excludes the entity from default listings — it does not
remove it from the map or the log. A life is not meant to be pruned.

## The query layer

`Queries.ts` is deliberately separate from `World.ts`. World owns
mutation and the two or three lookups (`getEntity`, `getRelationship`)
that are really just map access. Everything else — every question you
might want to ask the graph — is a plain function of `(World, ...) ->
typed result`, built from five small traversal primitives
(`getOutgoingRelationships`, `getIncomingRelationships`,
`getTouchingRelationships`, `getOtherEntity`, `getNeighborEntities`) plus
two type/kind filters. The six queries this sprint names —

- `findRelatedEntities` — every neighbor of an entity, optionally filtered
  by relationship kind or minimum strength.
- `findConversationsMentioning` — every Conversation with an outgoing
  `mentions` edge to a given entity.
- `findStrongestConnections` — every neighbor of an entity, ranked by
  edge strength.
- `findRecentEmotionalChanges` — every Emotion entity touched since a
  given time, most recent first (reads the event log).
- `findIncompleteMissions` — every Mission whose `status` attribute isn't
  `"complete"`.
- `findHabitsAffectingWorkouts` — every Habit with an `improves` or
  `blocks` edge into a Workout.

are not hand-rolled special cases. Each is a short composition of the
primitives above it, which is what keeps adding a seventh, an eighth, a
fiftieth query cheap indefinitely — the hard traversal logic is written
once.

## WorldEngine: the one import most callers need

`WorldEngine.ts` wraps a `World` instance and re-exposes mutation,
reading, querying, and type registration as one surface, so a caller
doesn't need to import five files to do ordinary work. Most of its
methods are direct pass-throughs and hold no logic of their own — the
exception is `capture()`, which creates an entity and relates it to zero
or more existing entities in a single call. This is the shape the future
Intelligence Engine integration is expected to lean on most: "remember
this, in the context of what it's about" is one thought, and the API
reads that way rather than forcing every caller to write `createEntity`
immediately followed by one or more `relate` calls by hand.

## Capable of representing an entire human life

Nothing in this design assumes a ceiling. Entity types are open. Edge
kinds are open. The attribute bag is arbitrary JSON, so a type nobody has
invented yet doesn't need this module to change to hold its data. Every
entity can connect to every other entity regardless of type — a Workout
can `belongs_to` a Goal, a JournalEntry can `mentions` an Emotion which
`caused_by` a Conversation which `references` a Decision which
`created_from` an Insight — and the World does not need to know any of
those combinations in advance to store or traverse them. That is the
whole point: a schema enumerates what a life can contain; a graph of
typed entities and typed relationships only has to know how to hold
whatever it's given.
