import { API_URL } from "./config";
import type { DetectionResponse, HealthResponse } from "./types";

export class ApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string };
    if (typeof body.detail === "string") return body.detail;
  } catch {
    // Non-JSON error bodies are fine; fall through to the status text.
  }
  return response.statusText || `HTTP ${response.status}`;
}

export async function checkHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/health`, { signal, cache: "no-store" });
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  return (await response.json()) as HealthResponse;
}

export async function detectObjects(
  frame: Blob,
  signal?: AbortSignal,
): Promise<DetectionResponse> {
  const body = new FormData();
  body.append("frame", frame, "frame.jpg");

  const response = await fetch(`${API_URL}/detect`, {
    method: "POST",
    body,
    signal,
  });

  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  return (await response.json()) as DetectionResponse;
}
