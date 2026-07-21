import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recoverWorld } from "../../src/persistence/Recovery.js";
import { runConversePipeline } from "../../src/ai/ConversePipeline.js";
import { FakeAIProvider } from "./fakeProvider.js";

const MIGRATIONS_DIR = new URL("../../database/migrations", import.meta.url).pathname;

let tempDir: string | undefined;

function tempDatabasePath(): string {
  tempDir = mkdtempSync(join(tmpdir(), "volt-converse-recovery-"));
  return join(tempDir, "volt.sqlite");
}

afterEach(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

async function collect<T>(generator: AsyncGenerator<T>): Promise<T[]> {
  const events: T[] = [];
  for await (const event of generator) events.push(event);
  return events;
}

/**
 * Proves Phase 9's "restart recovery" requirement specifically for the
 * conversation pipeline: a real Conversation, its Messages, and any
 * Proactive Intelligence artifacts a turn produced must all still be there
 * — as real World entities, not just rows nobody rebuilds — after the
 * backend process restarts. Same restart-simulation technique as
 * tests/persistence/recovery.test.ts: two separate recoverWorld() calls
 * against the same on-disk database, standing in for two separate
 * process lifetimes.
 */
describe("conversation persistence across a simulated backend restart", () => {
  it("keeps the Conversation, both Messages, and Proactive Intelligence artifacts after restart", async () => {
    const path = tempDatabasePath();

    const first = recoverWorld(path, MIGRATIONS_DIR);
    const engine = first.world.getEngine();

    engine.createEntity({ type: "Trace", attributes: { title: "trace one", weight: 1 } });
    engine.createEntity({ type: "Trace", attributes: { title: "trace two", weight: 1 } });
    engine.createEntity({ type: "Trace", attributes: { title: "trace three", weight: 1 } });

    await collect(
      runConversePipeline(engine, new FakeAIProvider(["Sure, I remember."]), {
        conversationId: "restart-test",
        text: "do you remember my traces?"
      })
    );

    first.db.close();

    const second = recoverWorld(path, MIGRATIONS_DIR);
    const restoredEngine = second.world.getEngine();
    const world = restoredEngine.getWorld();

    const conversation = world.listEntities().find((e) => e.type === "Conversation");
    expect(conversation?.attributes.clientConversationId).toBe("restart-test");

    const messages = world.listEntities().filter((e) => e.type === "Message");
    expect(messages).toHaveLength(2);
    expect(messages.find((m) => m.attributes.role === "assistant")?.attributes.text).toBe("Sure, I remember.");

    const observations = world.listEntities().filter((e) => e.type === "Observation");
    expect(observations.length).toBeGreaterThan(0);

    second.db.close();
  });
});
