export interface Mission {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
}

const MOCK_MISSIONS: Mission[] = [
  {
    id: "m1",
    title: "Stabilize the Core",
    detail: "Run a full diagnostic pass and confirm nothing in the field is drifting."
  },
  {
    id: "m2",
    title: "Clear the backlog",
    detail: "Commit the traces you've been sitting on before they lose context."
  },
  {
    id: "m3",
    title: "Review the last cycle",
    detail: "Walk back through what changed since the last checkpoint."
  }
];

export function getActiveMission(): Mission {
  const index = Math.floor(Date.now() / 86_400_000) % MOCK_MISSIONS.length;
  return MOCK_MISSIONS[index];
}
