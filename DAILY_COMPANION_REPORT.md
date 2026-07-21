# Daily Companion Report — Integration Sprint 4

VOLT now recognizes days. Opening the app for the first time on a given
calendar day creates a session, greets the user with an observation (never
a conversation), and — from the next day onward — already knows what
happened the day before. This report documents the lifecycle, why it's
built the way it is, and what's honestly still missing.

## Daily lifecycle

```
User opens VOLT
  │
  ▼
useDailySession() fires POST /daily/open in the background
  (fire-and-forget — never gates first paint, see Performance below)
  │
  ▼
findOrCreateDailySession(dayKey)
  │
  ├─ new day?  →  sessionCreated: true
  │                 │
  │                 ▼
  │              computeGreeting() — a read, never a write:
  │                1. yesterday's CheckIn had good sleep? → "You slept well."
  │                2. yesterday had a Workout? → "You trained yesterday."
  │                3. a fresh, confident Observation/Insight already exists? → its statement
  │                4. yesterday had a Trace committed? → "You've been focused lately."
  │                5. otherwise → "Today is clear."
  │
  └─ same day again?  →  sessionCreated: false, no greeting shown again
  │
  ▼
yesterday's DailySummary already generated?
  │
  ├─ yes → return it as-is
  ├─ no, and yesterday had a session (real usage) → generateDailySummary() (one AI call, collected in full — see Summary generation)
  └─ no, and yesterday never happened → yesterdaySummary: null
  │
  ▼
Response: { sessionCreated, greeting, yesterdaySummary }
  │
  ▼
CoreMode shows the greeting once, via the existing IdlePrompt overlay,
dispatching the existing MEMORY_FOUND CoreEvent — no new UI component,
no new CoreEvent type.

Meanwhile, at any point: the user can swipe down (the one gesture
direction the app didn't already use) into DailyMode — a check-in form
(if not already done today) and today's Timeline, computed on demand.
```

## Session creation

`src/daily/DailySession.ts` — one `DailySession` entity per calendar day,
keyed by `attributes.dayKey` (a plain `YYYY-MM-DD` string). "Every calendar
day has one World" (this sprint's own framing) does **not** mean a second
World per day — Sprint 2 already settled there is exactly one canonical
World, and this sprint doesn't reopen that. A DailySession is a hub
entity a day's activity can point back to via `belongs_to`, nothing more.

**The backend has no timezone of its own.** Every day boundary — `dayKey`,
`dayStartMs`, `dayEndMs` — is computed client-side
(`mobile/src/utils/day.ts`, using the device's local `Date` accessors, not
`toISOString()`/UTC) and sent to the backend as plain values it trusts.
This is a deliberate split: the user's day rolls over at their own local
midnight, which only the device actually knows; the backend just needs
numbers to filter by. (One existing UTC-based `dayKey()` helper already
lived in `PatternEngine.ts`, used only for "how many distinct days did a
streak span" — a different, narrower purpose that UTC suits fine. This
sprint's day boundaries are a new, separate, local-time concept.)

`findOrCreateDailySession` is idempotent: calling it again for a `dayKey`
that already has a session returns the same entity with `created: false`
— this is what "first launch today" means, decided by the backend (the
one place with a durable record), not tracked as local app state.

## Timeline architecture

**Computed on demand, not stored.** `src/daily/Timeline.ts`'s
`buildTimeline(engine, {startMs, endMs})` filters the World's existing
entities by `createdAt` falling in a half-open range and returns them
sorted oldest-first. There is no `timeline_items` table, no per-day list
entity, no edges from a day to "everything that happened" — every item on
a Timeline already exists as an Entity for its own reason (a `Trace`, a
`Message`'s parent `Conversation`, a completed `Mission`); Timeline only
selects and orders. Storing a second copy would be exactly the duplicate
storage this sprint's own "World Integration" section forbids.

The eight kinds named in the sprint spec map directly onto entity types
that already existed (from Sprint 0/1's original 21, or Sprint 2/3's
additions) — nothing new had to be invented except `CheckIn` itself:

| Sprint 4 name | Entity type | Filter |
|---|---|---|
| Check-ins | `CheckIn` | — |
| Thoughts | `Trace` | — |
| Conversations | `Conversation` | — |
| Insights | `Insight` | — |
| Completed missions | `Mission` | `attributes.status === "complete"` |
| Workout events | `Workout` | — |
| Journal entries | `JournalEntry` | — |
| Important memories | `Memory` | — |

A Timeline shows one row per **Conversation**, not one per Message — "you
had a conversation" is the timeline-scale fact; the individual turns are
still fully there via `GET /world` → `Message` entities `belongs_to` that
Conversation, for anything that wants that depth.

## Summary generation

`src/daily/DailySummary.ts` reuses Sprint 3's AI machinery wholesale —
`buildPrompt`, `BehaviorBible`, the single `AIProvider` instance — with one
new piece: an instruction that hands the model the day's Timeline and asks
for exactly five headers (`Today's highlights`, `Patterns noticed`,
`Important conversations`, `Completed work`, `Suggestions for tomorrow`),
explicitly told never to describe something not in the list it was given.
No new AI provider, per the sprint's own constraint — the only new code is
what the prompt asks for.

**Generated lazily, not on a schedule.** This app has no scheduler/cron,
and Sprint 4 didn't ask for one — "at the end of the day VOLT *can*
generate" a summary is satisfied by generating it the next time the app
opens and finds one missing, inside the same `POST /daily/open` call that
also creates today's session. A day with zero recorded activity still gets
a summary — a short, free, canned "Nothing notable" one — persisted
immediately so a quiet day is never re-attempted (and never re-billed) on
every subsequent open.

Every DailySummary is persisted with the same evidence-trail convention
Proactive Intelligence already established (Sprint 2/3): `belongs_to` its
day's DailySession, `references` the Timeline entities it was actually
given (capped at 30, to keep the relationship list bounded on a very busy
day).

## World Integration (the "no duplicate storage" chain)

Every daily action really does flow World Event → Entity → Relationship →
Proactive analysis → Memory, using existing machinery at each step:

- A check-in calls `WorldEngine.capture()` — the exact same entity-creation
  path everything else in VOLT uses — which appends a `WorldEvent`,
  updates the `CheckIn` entity, and creates its `belongs_to` edge to the
  day's session, atomically from the caller's perspective (Sprint 0's
  design, unchanged).
- `POST /checkin` then calls `runProactiveAnalysis()` — the exact function
  `POST /converse` already called in Sprint 3, extracted this sprint into
  `src/ai/ProactiveAnalysis.ts` specifically so both routes share one
  implementation rather than two copies of the same logic.
- Anything Proactive Intelligence found becomes a persisted `Observation`/
  `Insight`/`Suggestion` entity, which `buildMemoryContext` (Sprint 3,
  untouched) can surface to a *future* conversation — this is the "Memory
  updates" link, and it already worked before this sprint; Sprint 4 just
  gives it more to find.

## Performance

**"Application opens in under 2 seconds" is honored by never gating on
`/daily/open`.** `useDailySession()` fires the request in a background
`useEffect`, following the exact fire-and-forget shape `useTraces.ts`
already established for `GET /world` — first paint never awaits it. This
matters concretely here: the first `/daily/open` after a day with no
summary yet can trigger a real, multi-second AI call server-side (full
non-streamed collection, since nothing is watching tokens arrive for a
background summary). Gating the UI on that would mean the app being used
correctly (every day) is exactly what would make it feel slow — the
opposite of this sprint's goal.

The Timeline itself is only fetched when `DailyMode` actually becomes
visible (swipe down), not eagerly on app launch — a second reason app open
stays cheap regardless of how much history a long-time user has
accumulated.

## Testing

99 backend tests (19 files, 34 new this sprint), 14 mobile tests (4 new):

- **Day rollover / multiple days** (`tests/daily/dailySession.test.ts`,
  `tests/api/daily.test.ts`) — idempotent session creation, a fresh session
  per new `dayKey`, a full three-day flow through `POST /daily/open`
  proving day 2 lazily generates day 1's summary and a genuinely quiet
  day 2 still gets a (canned) summary rather than being retried forever.
- **Timeline ordering** (`tests/daily/timeline.test.ts`) — chronological
  sort independent of creation order, all eight kinds included, incomplete
  Missions excluded, range boundaries correctly half-open.
- **Summary generation** (`tests/daily/dailySummary.test.ts`) — persisted
  text matches the provider's real output, evidence trail references the
  actual Timeline entities, an empty day never calls the provider at all.
- **Restart recovery** (`tests/daily/dailyRestartRecovery.test.ts`) —
  extends Sprint 2's own restart proof: a DailySession, a CheckIn, and a
  generated DailySummary all survive two separate `recoverWorld()` calls
  against the same on-disk database.
- **Greeting rule priority** (`tests/daily/greeting.test.ts`) — each of
  the five rules fires correctly and in the right order, expired/
  low-confidence artifacts are correctly ignored.
- **Local day-boundary math** (`mobile/src/utils/day.test.ts`) — the one
  piece of genuinely new date logic in this sprint, tested for month/year
  rollover and the half-open range convention, independent of real device
  timezone.

All backend daily tests run against `FakeAIProvider`/`FailingAIProvider`
(Sprint 3's fixtures) — no network access or API key needed.

## Remaining limitations

- **The Timeline's "Conversations" row doesn't show which conversation was
  actually important.** Every Conversation entity shows the same generic
  "Had a conversation." line — Sprint 4 didn't ask for per-conversation
  titling/summarization on the timeline itself (that's closer to what the
  DailySummary's own "Important conversations" section already does in
  prose).
- **No Workout- or JournalEntry-creating UI exists anywhere in the app.**
  Both entity types were already registered (Sprint 0/1) and the Timeline
  correctly surfaces them if anything creates one, but nothing in this
  sprint added a way to create one from mobile — same honest gap as
  FocusMode's "missions," which are still a local mock array
  (`mobile/src/services/missions.ts`) never wired to a real `Mission`
  entity, so "Completed missions" on the Timeline will show nothing until
  that's connected, unrelated to this sprint.
- **`computeGreeting`'s rules are a reasonable, literal reading of the
  sprint's own four examples, not a general-purpose insight ranker.** A
  fifth rule (or reordering the existing four) is one function to edit,
  not an architecture change — this was a deliberate scope choice over
  running fresh Proactive Intelligence detection on every app open, which
  would cost compute and risk World bloat on a moment that's supposed to
  be quiet.
- **DailySummary generation is a single non-streamed AI call.** Reasonable
  for a background, no-one's-watching request — but if a very active day
  produces a very long Timeline, that's one un-truncated prompt; there's
  no chunking/map-reduce strategy for an unusually large day yet.
- **Mobile doesn't re-fetch a past day's Timeline or summary** — `DailyMode`
  only ever shows *today's* Timeline and *yesterday's* summary. Browsing
  "last Tuesday" isn't wired up; the data is fully there and queryable
  (`GET /timeline?startMs=&endMs=` takes any range), just not exposed in
  the UI this sprint — consistent with "no redesign."
