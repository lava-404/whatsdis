"use client";

import { useEffect, useRef, useState } from "react";
import { DETECTION_TTL_MS } from "@/lib/config";
import { formatConfidence } from "@/lib/copy";
import { clampToElement, colorForLabel, projectBox } from "@/lib/geometry";
import type { ObjectFit } from "@/lib/geometry";
import type { TrackedDetection } from "@/hooks/useDetectionBuffer";
import type { FrameInfo } from "@/lib/types";
import styles from "./DetectionOverlay.module.css";

interface DetectionOverlayProps {
  detections: TrackedDetection[];
  frame: FrameInfo | null;
  fit: ObjectFit;
  mirrored: boolean;
}

/** Tag chips need room above the box; below this they flip inside it. */
const TAG_HEIGHT = 24;

/**
 * Draws boxes over the video.
 *
 * The overlay is a sibling of the <video>, sized to the same box, so a single
 * ResizeObserver here is enough to keep projection correct through rotation,
 * window resizing, and the mobile URL bar collapsing.
 */
export default function DetectionOverlay({
  detections,
  frame,
  fit,
  mirrored,
}: DetectionOverlayProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const ready = frame !== null && size.width > 0 && size.height > 0;

  return (
    <div className={styles.overlay} ref={ref} aria-hidden="true">
      {ready
        ? detections.map((detection) => {
            const projected = projectBox(detection.box, {
              frameWidth: frame.width,
              frameHeight: frame.height,
              elementWidth: size.width,
              elementHeight: size.height,
              fit,
              mirrored,
            });

            const visible = clampToElement(projected, size.width, size.height);
            if (!visible) return null;

            const color = colorForLabel(detection.label);
            const stale = detection.ageMs > DETECTION_TTL_MS * 0.5;
            const tagInside = visible.y < TAG_HEIGHT;

            return (
              <div
                key={detection.key}
                className={`${styles.box} ${stale ? styles.stale : ""}`}
                style={{
                  left: `${visible.x}px`,
                  top: `${visible.y}px`,
                  width: `${visible.width}px`,
                  height: `${visible.height}px`,
                  ["--box-color" as string]: color,
                }}
              >
                <span className={`${styles.corner} ${styles.tl}`} />
                <span className={`${styles.corner} ${styles.tr}`} />
                <span className={`${styles.corner} ${styles.bl}`} />
                <span className={`${styles.corner} ${styles.br}`} />

                <div
                  className={`${styles.tag} ${tagInside ? styles.tagInside : ""}`}
                >
                  <span className={styles.tagName}>{detection.label}</span>
                  <span className={styles.tagScore}>
                    {formatConfidence(detection.confidence)}
                  </span>
                </div>
              </div>
            );
          })
        : null}
    </div>
  );
}
