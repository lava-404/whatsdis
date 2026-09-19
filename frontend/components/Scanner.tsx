"use client";

import { useState } from "react";
import { TAGLINE, WORDMARK } from "@/lib/copy";
import Button from "./Button";
import CameraStage from "./CameraStage";
import ConsolePanel from "./ConsolePanel";
import DetectionPanel from "./DetectionPanel";
import StatusStrip from "./StatusStrip";
import { useScanner } from "./ScannerProvider";
import styles from "./Scanner.module.css";

type Panel = "objects" | "console";

export default function Scanner() {
  const {
    camera,
    shot,
    log,
    stage,
    status,
    link,
    modelName,
    resolution,
    shots,
    fit,
    toggleFit,
    scanlines,
    startCamera,
    flipCamera,
    takeShot,
    retake,
    saveSnapshot,
  } = useScanner();

  const [panel, setPanel] = useState<Panel>("objects");

  const result = shot.analysis;
  const detections = result?.detections ?? [];

  return (
    <div className={styles.scanner}>
      <header className={styles.banner}>
        <div>
          <p className={styles.wordmark}>{WORDMARK}</p>
          <p className={styles.tagline}>{TAGLINE}</p>
        </div>
        <div className={styles.badge} aria-hidden="true">
          <span>
            NOW
            <br />
            WITH
            <br />
            NEURAL
            <br />
            NETS
          </span>
        </div>
      </header>

      <div className={styles.work}>
        <div className={styles.main}>
          <CameraStage
            videoRef={camera.videoRef}
            cameraActive={camera.active}
            starting={camera.starting}
            mirrored={camera.mirrored}
            fit={fit}
            snapshot={shot.snapshot}
            busy={shot.busy}
            flashing={shot.flashing}
            scanlines={scanlines}
            detections={detections}
            frame={result?.frame ?? null}
            resolution={resolution}
          />

          <div className={styles.controls}>
            {stage === "idle" ? (
              <Button
                variant="start"
                size="large"
                icon={"\u25B6"}
                onClick={startCamera}
                disabled={camera.starting}
              >
                {camera.starting ? "Opening camera\u2026" : "Turn on camera"}
              </Button>
            ) : stage === "result" ? (
              <Button variant="start" size="large" icon={"\u21BA"} onClick={retake}>
                Shoot again
              </Button>
            ) : (
              <Button
                variant="start"
                size="large"
                icon={"\u25C9"}
                onClick={takeShot}
                disabled={shot.busy}
              >
                {shot.busy ? "Identifying\u2026" : "Name that shi"}
              </Button>
            )}

            {stage === "result" ? (
              <Button onClick={saveSnapshot} disabled={!result}>
                Save snapshot
              </Button>
            ) : null}

            {camera.hasMultipleCameras ? (
              <Button onClick={flipCamera} disabled={!camera.active || shot.busy}>
                Flip camera
              </Button>
            ) : null}

            <Button onClick={toggleFit}>
              {fit === "contain" ? "Fill screen" : "Whole frame"}
            </Button>

            <Button onClick={log.clear}>Clear log</Button>
          </div>
        </div>

        <div className={styles.side}>
          <div className={styles.tabs} role="tablist" aria-label="Scanner panels">
            <button
              type="button"
              role="tab"
              aria-selected={panel === "objects"}
              className={`${styles.tab} ${panel === "objects" ? styles.tabActive : ""}`}
              onClick={() => setPanel("objects")}
            >
              Objects ({detections.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={panel === "console"}
              className={`${styles.tab} ${panel === "console" ? styles.tabActive : ""}`}
              onClick={() => setPanel("console")}
            >
              Console
            </button>
          </div>

          <div
            className={`${styles.sideTop} ${panel === "objects" ? "" : styles.sideHidden}`}
          >
            <DetectionPanel detections={detections} hasResult={result !== null} />
          </div>

          <div
            className={`${styles.sideBottom} ${panel === "console" ? "" : styles.sideHidden}`}
          >
            <ConsolePanel lines={log.lines} live={shot.busy} />
          </div>
        </div>
      </div>

      <StatusStrip
        status={status}
        link={link}
        shots={shots}
        roundTripMs={result?.roundTripMs ?? null}
        inferenceMs={result?.inferenceMs ?? null}
        modelName={modelName}
        objectCount={detections.length}
      />
    </div>
  );
}
