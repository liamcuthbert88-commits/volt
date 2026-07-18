import { describe, expect, it } from "vitest";
import { World } from "../src/world/World";

describe("World", () => {
  it("creates an empty world", () => {
    const world = World.create();

    expect(world.history()).toEqual([]);
  });
});
