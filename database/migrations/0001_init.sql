-- 0001_init: the event log.
--
-- This is deliberately the only table this migration creates. Per Phase 4
-- of Integration Sprint 2, the event log is authoritative and everything
-- else — the current state of every Entity and Relationship — is a
-- projection derived from it (see WorldStore.applyEvent /
-- WorldStore.restore). A separate `entities` / `relationships` table
-- holding current state would either have to be kept in perfect lockstep
-- with this log (pure redundancy) or would eventually drift from it
-- (a second source of truth, which Phase 2 explicitly rules out). One
-- authoritative table, one derived in-memory projection rebuilt from it
-- on every startup.

CREATE TABLE IF NOT EXISTS world_events (
  -- WorldStore's own monotonic, never-reused sequence counter. Doubles as
  -- this table's replay order and its duplicate-prevention key.
  sequence  INTEGER PRIMARY KEY,
  id        TEXT NOT NULL UNIQUE,
  type      TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  -- The full WorldEvent, JSON-encoded. A discriminated union of six event
  -- shapes (ENTITY_CREATED, ENTITY_UPDATED, ENTITY_ARCHIVED,
  -- RELATIONSHIP_CREATED, RELATIONSHIP_UPDATED, RELATIONSHIP_REMOVED) is
  -- not worth six tables; `type` above is still a real column so the
  -- shape of an event is queryable without deserializing `payload`.
  payload   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_world_events_type ON world_events(type);
CREATE INDEX IF NOT EXISTS idx_world_events_timestamp ON world_events(timestamp);
