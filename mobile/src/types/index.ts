export interface Trace {
  readonly id: string;
  readonly title: string;
  readonly weight: number;
}

export interface WorldView {
  traces: Trace[];
}

export interface Point {
  x: number;
  y: number;
}
