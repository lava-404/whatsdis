import { colorForLabel } from "./geometry";
import { formatConfidence } from "./copy";
import type { Analysis } from "./types";

/**
 * Renders the captured still with its boxes burned in, then hands the browser
 * a PNG to save.
 *
 * Drawing happens at the snapshot's native size, so the projection collapses
 * to a scale of 1 and only the mirror flip needs handling.
 */
export async function downloadAnnotatedSnapshot(
  analysis: Analysis,
  filename: string,
): Promise<void> {
  const { snapshot, detections } = analysis;

  const image = await loadImage(snapshot.url);
  const canvas = document.createElement("canvas");
  canvas.width = snapshot.width;
  canvas.height = snapshot.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable in this browser.");

  if (snapshot.mirrored) {
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.setTransform(1, 0, 0, 1, 0, 0);

  const scale = Math.max(1, canvas.width / 640);
  const lineWidth = Math.round(2 * scale);
  const fontSize = Math.round(15 * scale);
  context.font = `${fontSize}px monospace`;
  context.textBaseline = "top";

  for (const detection of detections) {
    const color = colorForLabel(detection.label);
    const { box } = detection;
    const x = snapshot.mirrored
      ? canvas.width - (box.x + box.width)
      : box.x;

    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.strokeRect(x, box.y, box.width, box.height);

    const text = `${detection.label.toUpperCase()} ${formatConfidence(detection.confidence)}`;
    const padding = Math.round(4 * scale);
    const textWidth = context.measureText(text).width;
    const tagHeight = fontSize + padding * 2;
    // Flip the tag inside the box when there is no room above it.
    const tagY = box.y - tagHeight < 0 ? box.y + lineWidth : box.y - tagHeight;

    context.fillStyle = color;
    context.fillRect(x, tagY, textWidth + padding * 2, tagHeight);
    context.fillStyle = "#06170b";
    context.fillText(text, x + padding, tagY + padding);
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/png");
  });
  if (!blob) throw new Error("The snapshot could not be encoded.");

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // Give the browser a tick to start the download before pulling the URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Plain-text summary of a result, for the clipboard. */
export function summariseAnalysis(analysis: Analysis): string {
  if (analysis.detections.length === 0) {
    return "Name That Shi found nothing in this frame.";
  }

  const lines = analysis.detections.map(
    (detection, index) =>
      `${index + 1}. ${detection.label} \u2014 ${formatConfidence(detection.confidence)}`,
  );

  return [
    `Name That Shi \u2014 ${analysis.detections.length} object(s) identified`,
    ...lines,
    `(inference ${Math.round(analysis.inferenceMs)}ms)`,
  ].join("\n");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The snapshot could not be read."));
    image.src = src;
  });
}
