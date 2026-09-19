function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

/**
 * Longest edge of the JPEG we upload.
 *
 * One deliberate shot per analysis, so this can be generous where a streaming
 * pipeline could not afford it — bigger frames mean small objects survive.
 */
export const CAPTURE_MAX_EDGE = num(
  process.env.NEXT_PUBLIC_CAPTURE_MAX_EDGE,
  960,
);

export const CAPTURE_QUALITY = 0.88;

/** How long the shutter flash stays on screen. */
export const SHUTTER_FLASH_MS = 220;
