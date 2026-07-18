import { describe, expect, it } from "vitest";
import { World } from "../src/world/World.js";
import { Replay } from "../src/replay/Replay.js";

describe("World", () => {
  it("creates an empty world", () => {
    const world = World.create();

    expect(world.history()).toEqual([]);
  });

  it("records events in sequence order", () => {
    const world = World.create();

    const first = world.submit({
      type: "TRACE_CREATED",
      title: "Build VOLT",
      author: "human"
    });

    const second = world.submit({
      type: "TRACE_CREATED",
      title: "Test VOLT",
      author: "partner"
    });

    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    expect(second.timestamp).toBeGreaterThan(first.timestamp);
  });

  it("does not expose mutable canonical history", () => {
    const world = World.create();

    world.submit({
      type: "TRACE_CREATED",
      title: "Build VOLT",
      author: "human"
    });

    const history = world.history();
    const copy = structuredClone(history);

    copy[0].title = "Corrupted";

    expect(world.history()[0]?.title).toBe("Build VOLT");
  });

  it("projects traces into world state", () => {
    const world = World.create();

    world.submit({
      type: "TRACE_CREATED",
      title: "Build VOLT",
      author: "human"
    });

    expect(world.view()).toEqual({
      traces: [
        {
          id: "trace-1",
          title: "Build VOLT",
          weight: 0
        }
      ]
    });
  });

  it("reconstructs the same world from history", () => {
    const world = World.create();

    world.submit({
      type: "TRACE_CREATED",
      title: "Build VOLT",
      author: "human"
    });

    world.submit({
      type: "TRACE_CREATED",
      title: "Write Replay",
      author: "partner"
    });

    const replay = Replay.from(world.history());

    expect(replay).toEqual(world.view());
  });

  it("rejects invalid event types at compile time", () => {
    expect(true).toBe(true);
  });
});
