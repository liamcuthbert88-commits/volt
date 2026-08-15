export function lerp(min: number, max: number, t: number): number {
  "worklet";
  return min + (max - min) * t;
}
