"use client";

import type { RefObject } from "react";
import { IDLE_HINT } from "@/lib/copy";
import type { ObjectFit } from "@/lib/geometry";
import type { FrameInfo, KeyedDetection, Snapshot } from "@/lib/types";
import DetectionOverlay from "./DetectionOverlay";
import styles from "./CameraStage.module.css";

interface CameraStageProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  cameraActive: boolean;
  starting: boolean;
  mirrored: boolean;
  fit: ObjectFit;
  snapshot: Snapshot | null;
  busy: boolean;
  flashing: boolean;
  scanlines: boolean;
  detections: KeyedDetection[];
  frame: FrameInfo | null;
  resolution: string;
}

/**
 * The tube. Holds the live preview, the frozen still, the box overlay, and an
 * on-glass HUD.
 *
 * The <video> is always mounted, even when idle — tearing it out of the DOM
 * between sessions loses the element's ref and makes Safari re-prompt. The
 * still simply covers it while a result is on screen.
 */
export default function CameraStage({
  videoRef,
  cameraActive,
  starting,
  mirrored,
  fit,
  snapshot,
  busy,
  flashing,
  scanlines,
  detections,
  frame,
  resolution,
}: CameraStageProps) {
  const surfaceClasses = (base: string) =>
    [
      base,
      fit === "cover" ? styles.fitCover : styles.fitContain,
      mirrored ? styles.mirrored : "",
    ]
      .filter(Boolean)
      .join(" ");

  const hudState = busy ? "ANALYSING" : snapshot ? "RESULT" : "LIVE";

  return (
    <div className={styles.bezel}>
      <div className={`${styles.tube} ${scanlines ? "crtLines" : ""}`}>
        <video
          ref={videoRef}
          className={surfaceClasses(styles.video)}
          playsInline
          muted
          autoPlay
          aria-label="Live camera preview"
        />

        {snapshot ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={snapshot.url}
            alt="Captured frame awaiting identification"
            className={surfaceClasses(styles.still)}
            style={snapshot.mirrored ? { transform: "scaleX(-1)" } : undefined}
          />
        ) : null}

        {snapshot && frame ? (
          <DetectionOverlay
            detections={detections}
            frame={frame}
            fit={fit}
            mirrored={snapshot.mirrored}
          />
        ) : null}

        {busy ? <div className={styles.sweep} aria-hidden="true" /> : null}
        {flashing ? <div className={styles.flash} aria-hidden="true" /> : null}

        {cameraActive ? (
          <div className={styles.hud} aria-hidden="true">
            <div className={styles.hudTop}>
              <span>CAM 01</span>
              {busy ? (
                <span className={`${styles.rec} ${styles.busy}`}>
                  <span className={styles.recDot} />
                  {hudState}
                </span>
              ) : (
                <span>{hudState}</span>
              )}
            </div>
            <div className={styles.hudBottom}>
              <span>{snapshot ? `${snapshot.width}x${snapshot.height}` : resolution}</span>
              <span>{snapshot && !busy ? `${detections.length} OBJ` : "READY"}</span>
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
