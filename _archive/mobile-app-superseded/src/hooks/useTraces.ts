import { useCallback, useEffect, useState } from "react";
import { createTrace, fetchWorld } from "../services/volt";
import { worldEngine } from "../world/WorldEngine";
import type { Trace } from "../types";

/** Mirrors backend Traces into the Living World as Entities, keyed by
 *  `attributes.backendId` so a trace already mirrored is never duplicated.
 *  The backend (`GET /world` / `POST /trace`) stays the source of truth;
 *  this only gives the World graph — and, through it, Proactive
 *  Intelligence — visibility into what already exists there. */
function mirrorTracesIntoWorld(traces: readonly Trace[]): void {
  const world = worldEngine.getWorld();
  const known = new Set(
    world
      .listEntities()
      .filter((entity) => entity.type === "Trace")
      .map((entity) => entity.attributes.backendId)
  );

  for (const trace of traces) {
    if (known.has(trace.id)) continue;
    worldEngine.createEntity({
      type: "Trace",
      attributes: { title: trace.title, weight: trace.weight, backendId: trace.id },
      origin: { source: "import", note: "mirrored from backend GET /world" }
    });
  }
}

export function useTraces() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const world = await fetchWorld();
      setTraces(world.traces);
      mirrorTracesIntoWorld(world.traces);
    } catch {
      setError("Could not reach VOLT.");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const commit = useCallback(async (title: string) => {
    const world = await createTrace(title);
    setTraces(world.traces);
    mirrorTracesIntoWorld(world.traces);
  }, []);

  return { traces, error, commit };
}
