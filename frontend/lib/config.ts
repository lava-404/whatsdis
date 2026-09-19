function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

/** Minimum gap between frame submissions. One request is ever in flight. */
export const DETECT_INTERVAL_MS = num(
  process.env.NEXT_PUBLIC_DETECT_INTERVAL_MS,
  250,
);

/** Longest edge of the JPEG we upload. */
export const CAPTURE_MAX_EDGE = num(
  process.env.NEXT_PUBLIC_CAPTURE_MAX_EDGE,
  640,
);

export const CAPTURE_QUALITY = 0.72;

/**
 * How long a box survives without being re-detected. YOLO drops objects for a
 * single frame all the time; holding them briefly stops the overlay flickering.
 */
export const DETECTION_TTL_MS = 600;

/** Consecutive backend failures before we show a system fault dialog. */
export const FAILURE_THRESHOLD = 3;
