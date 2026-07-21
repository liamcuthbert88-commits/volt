import axios from "axios";
import type { WorldView } from "../types";

export const API_BASE = "http://192.168.1.195:3000";

const client = axios.create({ baseURL: API_BASE });

export async function fetchWorld(): Promise<WorldView> {
  const { data } = await client.get<WorldView>("/world");
  return data;
}

export async function createTrace(title: string): Promise<WorldView> {
  const { data } = await client.post<{ world: WorldView }>("/trace", {
    title,
    author: "human"
  });
  return data.world;
}
