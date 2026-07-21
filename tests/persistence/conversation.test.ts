import { describe, expect, it } from "vitest";
import { openDatabase } from "../../src/persistence/Database.js";
import { loadMigrations, runMigrations } from "../../src/persistence/MigrationRunner.js";
import { EventStore } from "../../src/persistence/EventStore.js";
import { WorldStore } from "../../src/world/canonical/WorldStore.js";
import { WorldEngine } from "../../src/world/canonical/WorldEngine.js";

const MIGRATIONS_DIR = new URL("../../database/migrations", import.meta.url).pathname;

function makeEngine(): { engine: WorldEngine; eventStore: EventStore } {
  const db = openDatabase(":memory:");
  runMigrations(db, loadMigrations(MIGRATIONS_DIR));
  const eventStore = new EventStore(db);
  const store = WorldStore.create((event) => eventStore.append(event));
  return { engine: new WorldEngine(store), eventStore };
}

/**
 * Proves Phase 3's "persist Conversation Threads, Messages" requirement:
 * both are registered entity types (see EntityTypes.ts), so persisting a
 * conversation is exactly the same mechanism as persisting anything else
 * in the World — create the Conversation entity, capture each Message
 * related to it via "belongs_to", and it survives replay like any other
 * entity. No bespoke conversation storage was built, because none was
 * needed.
 */
describe("Conversation + Message persistence", () => {
  it("persists a conversation thread and its messages, recoverable by replay", () => {
    const { engine, eventStore } = makeEngine();

    const conversation = engine.createEntity({ type: "Conversation", attributes: { startedAt: 1700000000000 } });
    const userMessage = engine.capture(
      { type: "Message", attributes: { role: "user", text: "I feel overwhelmed" } },
      [{ kind: "belongs_to", toId: conversation.id }]
    );
    const replyMessage = engine.capture(
      { type: "Message", attributes: { role: "assistant", text: "Tell me the single heaviest thing" } },
      [{ kind: "belongs_to", toId: conversation.id }]
    );

    const restoredStore = WorldStore.restore(eventStore.loadAll());
    const restoredEngine = new WorldEngine(restoredStore);

    const restoredConversation = restoredEngine.getEntity(conversation.id);
    expect(restoredConversation?.type).toBe("Conversation");

    const messages = restoredEngine.findRelatedEntities(conversation.id, { kind: "belongs_to" });
    expect(messages.map((message) => message.id).sort()).toEqual([userMessage.id, replyMessage.id].sort());
    expect(messages.map((message) => message.attributes.text)).toEqual(
      expect.arrayContaining(["I feel overwhelmed", "Tell me the single heaviest thing"])
    );
  });

  it("keeps each conversation's messages separate from another conversation's", () => {
    const { engine, eventStore } = makeEngine();

    const conversationA = engine.createEntity({ type: "Conversation", attributes: {} });
    const conversationB = engine.createEntity({ type: "Conversation", attributes: {} });
    engine.capture({ type: "Message", attributes: { role: "user", text: "in A" } }, [
      { kind: "belongs_to", toId: conversationA.id }
    ]);
    engine.capture({ type: "Message", attributes: { role: "user", text: "in B" } }, [
      { kind: "belongs_to", toId: conversationB.id }
    ]);

    const restored = new WorldEngine(WorldStore.restore(eventStore.loadAll()));
    expect(restored.findRelatedEntities(conversationA.id, { kind: "belongs_to" })).toHaveLength(1);
    expect(restored.findRelatedEntities(conversationB.id, { kind: "belongs_to" })).toHaveLength(1);
  });
});
