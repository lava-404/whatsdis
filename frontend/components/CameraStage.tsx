"use client";

import type { RefObject } from "react";
import { IDLE_HINT } from "@/lib/copy";
import type { ObjectFit } from "@/lib/geometry";
import type { TrackedDetection } from "@/hooks/useDetectionBuffer";
import type { FrameInfo } from "@/lib/types";
import DetectionOverlay from "./DetectionOverlay";
import styles from "./CameraStage.module.css";

interface CameraStageProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  cameraActive: boolean;
  scanning: boolean;
  starting: boolean;
  mirrored: boolean;
  fit: ObjectFit;
  detections: TrackedDetection[];
  frame: FrameInfo | null;
  resolution: string;
}

/**
 * The tube. Holds the live preview, the box overlay, and an on-glass HUD.
 *
 * The <video> is always mounted, even when idle — tearing it out of the DOM
 * between sessions loses the element's ref and makes Safari re-prompt.
 */
export default function CameraStage({
  videoRef,
  cameraActive,
  scanning,
  starting,
  mirrored,
  fit,
  detections,
  frame,
  resolution,
}: CameraStageProps) {
  const videoClasses = [
    styles.video,
    fit === "cover" ? styles.fitCover : styles.fitContain,
    mirrored ? styles.mirrored : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.bezel}>
      <div className={`${styles.tube} crtLines`}>
        <video
          ref={videoRef}
          className={videoClasses}
          playsInline
          muted
          autoPlay
          aria-label="Live camera preview"
        />

        {cameraActive ? (
          <DetectionOverlay
            detections={detections}
            frame={frame}
            fit={fit}
            mirrored={mirrored}
          />
        ) : null}

        {scanning ? <div className={styles.sweep} aria-hidden="true" /> : null}

        {cameraActive ? (
          <div className={styles.hud} aria-hidden="true">
            <div className={styles.hudTop}>
              <span>CAM 01</span>
              {scanning ? (
                <span className={styles.rec}>
                  <span className={styles.recDot} />
                  SCAN
                </span>
              ) : (
                <span>STANDBY</span>
              )}
            </div>
            <div className={styles.hudBottom}>
              <span>{resolution}</span>
              <span>
                {detections.length} OBJ
              </span>
            </div>
          </div>
        ) : (
          <div className={styles.placeholder}>
            <div className={styles.static} aria-hidden="true" />
            <div className={styles.placeholderIcon} aria-hidden="true">
              {starting ? "\u25CE" : "\u25A0"}
            </div>
            <p className={styles.placeholderTitle}>
              {starting ? "OPENING CAMERA" : "NO SIGNAL"}
            </p>
            <p className={styles.placeholderText}>
              {starting
                ? "Waiting for the browser to hand over the camera\u2026"
                : IDLE_HINT}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
