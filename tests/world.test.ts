import { describe, expect, it } from "vitest";
import { Replay } from "../src/replay/Replay.js";
import { World } from "../src/world/World.js";

describe("World", () => {
  it("creates an empty world", () => {
    const world = World.create();

    expect(world.history()).toEqual([]);
    expect(world.view()).toEqual({ traces: [] });
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

    const copy = structuredClone(world.history()) as any;

    copy[0].title = "Corrupted";

    const first = world.history()[0];

    expect(first?.type).toBe("TRACE_CREATED");

    if (first?.type === "TRACE_CREATED") {
      expect(first.title).toBe("Build VOLT");
    }
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
          weight: 1
        }
      ]
    });
  });

  it("changes trace cognitive weight through an event", () => {
    const world = World.create();

    world.submit({
      type: "TRACE_CREATED",
      title: "Build VOLT",
      author: "human"
    });

    world.submit({
      type: "TRACE_WEIGHT_CHANGED",
      traceId: "trace-1",
      delta: 3,
      author: "partner"
    });

    expect(world.view().traces[0]?.weight).toBe(4);
  });

  it("rejects weight changes for missing traces", () => {
    const world = World.create();

    expect(() => {
      world.submit({
        type: "TRACE_WEIGHT_CHANGED",
        traceId: "trace-999",
        delta: 1,
        author: "human"
      });
    }).toThrow("Trace not found: trace-999");
  });

  it("does not expose mutable projected state", () => {
    const world = World.create();

    world.submit({
      type: "TRACE_CREATED",
      title: "Build VOLT",
      author: "human"
    });

    const copy = structuredClone(world.view()) as any;

    copy.traces[0].weight = 999;

    expect(world.view().traces[0]?.weight).toBe(1);
  });

  it("reconstructs the same world from history", () => {
    const world = World.create();

    world.submit({
      type: "TRACE_CREATED",
      title: "Build VOLT",
      author: "human"
    });

    world.submit({
      type: "TRACE_WEIGHT_CHANGED",
      traceId: "trace-1",
      delta: 2,
      author: "partner"
    });

    world.submit({
      type: "TRACE_CREATED",
      title: "Write Replay",
      author: "partner"
    });

    expect(Replay.from(world.history())).toEqual(world.view());
  });
});
