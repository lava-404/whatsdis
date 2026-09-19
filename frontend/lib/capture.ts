import { CAPTURE_MAX_EDGE, CAPTURE_QUALITY } from "./config";
import type { Snapshot } from "./types";

/**
 * Freezes the current video frame into a still.
 *
 * The frame is never mirrored here. A front-facing preview is flipped in CSS
 * for presentation only; the model and the projection maths both work in raw
 * camera space, and the still carries a `mirrored` flag so the UI can apply
 * the same flip it was showing a moment ago.
 */
export async function takeSnapshot(
  video: HTMLVideoElement,
  mirrored: boolean,
): Promise<Snapshot | null> {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;

  if (!sourceWidth || !sourceHeight || video.readyState < 2) return null;

  const scale = Math.min(1, CAPTURE_MAX_EDGE / Math.max(sourceWidth, sourceHeight));
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return null;

  context.drawImage(video, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/jpeg", CAPTURE_QUALITY);
  });

  if (!blob) return null;

  return {
    url: URL.createObjectURL(blob),
    blob,
    width,
    height,
    mirrored,
    takenAt: Date.now(),
  };
}

/** Object URLs leak until revoked; every replaced snapshot goes through here. */
export function releaseSnapshot(snapshot: Snapshot | null): void {
  if (snapshot) URL.revokeObjectURL(snapshot.url);
}
