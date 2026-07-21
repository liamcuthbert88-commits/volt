import axios from "axios";
import { API_BASE } from "./volt";

const client = axios.create({ baseURL: API_BASE });

export interface OpenDayInput {
  readonly dayKey: string;
  readonly dayStartMs: number;
  readonly dayEndMs: number;
  readonly yesterdayKey?: string;
  readonly yesterdayStartMs?: number;
  readonly yesterdayEndMs?: number;
}

export interface DaySummary {
  readonly text: string;
  readonly generatedAt: number;
}

export interface OpenDayResult {
  readonly sessionCreated: boolean;
  readonly dailySessionId: string;
  readonly greeting: string;
  readonly yesterdaySummary: DaySummary | null;
}

export async function openDay(input: OpenDayInput): Promise<OpenDayResult> {
  const { data } = await client.post<OpenDayResult>("/daily/open", input);
  return data;
}

export interface CheckInInput {
  readonly dayKey: string;
  readonly mood: number;
  readonly energy: number;
  readonly focus: number;
  readonly sleepQuality: number;
  readonly stress: number;
  readonly thought: string;
}

export async function submitCheckIn(input: CheckInInput): Promise<void> {
  await client.post("/checkin", input);
}

export interface TimelineItem {
  readonly id: string;
  readonly type: string;
  readonly createdAt: number;
  readonly summary: string;
}

export async function fetchTimeline(startMs: number, endMs: number): Promise<TimelineItem[]> {
  const { data } = await client.get<{ items: TimelineItem[] }>("/timeline", { params: { startMs, endMs } });
  return data.items;
}
