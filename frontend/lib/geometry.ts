import type { Box } from "./types";

export type ObjectFit = "cover" | "contain";

export interface ProjectionParams {
  /** Width of the frame that was sent to the backend, in pixels. */
  frameWidth: number;
  frameHeight: number;
  /** Size of the <video> element's content box, in CSS pixels. */
  elementWidth: number;
  elementHeight: number;
  /** How the video element fills its box. Must match the CSS. */
  fit: ObjectFit;
  /** True when the preview is flipped horizontally (front-facing camera). */
  mirrored: boolean;
}

/**
 * Maps a box from source-frame pixel space into the coordinate space of the
 * rendered <video> element.
 *
 * The video is drawn with `object-fit`, so the element either crops the frame
 * (cover) or letterboxes it (contain). Either way the frame is scaled by a
 * single factor and centred, so the transform is a uniform scale plus an
 * offset — and then a horizontal flip if the preview is mirrored.
 */
export function projectBox(box: Box, params: ProjectionParams): Box {
  const {
    frameWidth,
    frameHeight,
    elementWidth,
    elementHeight,
    fit,
    mirrored,
  } = params;

  if (frameWidth <= 0 || frameHeight <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const scaleX = elementWidth / frameWidth;
  const scaleY = elementHeight / frameHeight;
  const scale = fit === "cover" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);

  const renderedWidth = frameWidth * scale;
  const renderedHeight = frameHeight * scale;
  const offsetX = (elementWidth - renderedWidth) / 2;
  const offsetY = (elementHeight - renderedHeight) / 2;

  const width = box.width * scale;
  const height = box.height * scale;
  const y = box.y * scale + offsetY;
  const left = box.x * scale + offsetX;

  // Mirroring is applied to the whole element via transform: scaleX(-1), and
  // the overlay is a sibling of the video rather than a child of it, so the
  // flip has to be reproduced here.
  const x = mirrored ? elementWidth - (left + width) : left;

  return { x, y, width, height };
}

/** Clamps a projected box to the visible element, dropping anything fully cropped out. */
export function clampToElement(
  box: Box,
  elementWidth: number,
  elementHeight: number,
): Box | null {
  const left = Math.max(0, box.x);
  const top = Math.max(0, box.y);
  const right = Math.min(elementWidth, box.x + box.width);
  const bottom = Math.min(elementHeight, box.y + box.height);

  if (right - left < 2 || bottom - top < 2) return null;

  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Stable per-label colour, so a "chair" is the same colour every frame. */
const PALETTE = [
  "#00ff66",
  "#00e5ff",
  "#ff2fd0",
  "#ffd400",
  "#ff7a00",
  "#7cff00",
  "#ff4b4b",
  "#b388ff",
];

export function colorForLabel(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
