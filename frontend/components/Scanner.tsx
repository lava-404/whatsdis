"use client";

import { useCallback, useEffect, useState } from "react";
import { checkHealth } from "@/lib/api";
import { FAILURE_THRESHOLD } from "@/lib/config";
import { TAGLINE, detectionLine } from "@/lib/copy";
import type { ObjectFit } from "@/lib/geometry";
import type { DetectionResponse, SystemFault } from "@/lib/types";
import { useCamera } from "@/hooks/useCamera";
import { useConsole } from "@/hooks/useConsole";
import { useDetectionBuffer } from "@/hooks/useDetectionBuffer";
import { useDetectionLoop } from "@/hooks/useDetectionLoop";
import Button from "./Button";
import CameraStage from "./CameraStage";
import ConsolePanel from "./ConsolePanel";
import DetectionPanel from "./DetectionPanel";
import StatusStrip from "./StatusStrip";
import type { LinkState } from "./StatusStrip";
import styles from "./Scanner.module.css";

type Panel = "objects" | "console";

interface ScannerProps {
  onFault: (fault: SystemFault) => void;
  /** Lets the shell mirror scanner state in the taskbar tray. */
  onScanningChange?: (scanning: boolean) => void;
}

export default function Scanner({ onFault, onScanningChange }: ScannerProps) {
  const camera = useCamera("environment");
  const buffer = useDetectionBuffer();
  const log = useConsole(["WhatsDis ready. Awaiting operator input."]);

  const [scanning, setScanning] = useState(false);
  const [fit, setFit] = useState<ObjectFit>("contain");
  const [panel, setPanel] = useState<Panel>("objects");
  const [link, setLink] = useState<LinkState>("busy");
  const [modelName, setModelName] = useState("yolo");
  const [resolution, setResolution] = useState("--");

  const { print, printOnce, clear: clearLog } = log;

  // --- backend handshake -------------------------------------------------

  useEffect(() => {
    const controller = new AbortController();

    checkHealth(controller.signal)
      .then((health) => {
        setLink(health.status === "ready" ? "online" : "busy");
        setModelName(health.model_name.replace(/\.pt$/, ""));
        print(
          `NEURAL NETWORK ONLINE: ${health.model_name} on ${health.device} (${health.classes} classes)`,
          "ok",
        );
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLink("offline");
        print("NEURAL NETWORK UNREACHABLE. Is the Python service running?", "error");
      });

    return () => controller.abort();
  }, [print]);

  // --- camera metadata ---------------------------------------------------

  useEffect(() => {
    const video = camera.videoRef.current;
    if (!video || !camera.stream) {
      setResolution("--");
      return;
    }

    const read = () => {
      if (video.videoWidth) {
        setResolution(`${video.videoWidth}x${video.videoHeight}`);
      }
    };

    read();
    video.addEventListener("loadedmetadata", read);
    return () => video.removeEventListener("loadedmetadata", read);
  }, [camera.stream, camera.videoRef]);

  // --- detection loop ----------------------------------------------------

  const { ingest: ingestDetections, reset: resetDetections } = buffer;

  const handleResult = useCallback(
    (result: DetectionResponse) => {
      ingestDetections(result);
    },
    [ingestDetections],
  );

  const handleFailure = useCallback(
    (error: unknown, consecutive: number) => {
      setLink("offline");
      const reason = error instanceof Error ? error.message : "unknown fault";

      if (consecutive < FAILURE_THRESHOLD) {
        printOnce(`FRAME REJECTED (${reason}). Retrying\u2026`, "warn");
        return;
      }

      setScanning(false);
      print("SCAN ABORTED. The neural network stopped answering.", "error");
      onFault({
        title: "Neural link lost",
        message: "The detection service stopped responding.",
        hint: `Last error: ${reason}. Check that the Python backend is running and reachable, then start the scanner again.`,
      });
    },
    [onFault, print, printOnce],
  );

  const handleRecover = useCallback(() => {
    setLink("online");
    print("NEURAL LINK RESTORED.", "ok");
  }, [print]);

  const stats = useDetectionLoop({
    videoRef: camera.videoRef,
    enabled: scanning && camera.active,
    onResult: handleResult,
    onFailure: handleFailure,
    onRecover: handleRecover,
  });

  // A successful result means the link is healthy again.
  useEffect(() => {
    if (stats.framesSent > 0 && link !== "online") setLink("online");
  }, [stats.framesSent, link]);

  // --- narrate new detections -------------------------------------------

  useEffect(() => {
    if (!scanning || buffer.freshLabels.length === 0) return;

    buffer.freshLabels.forEach((label) => {
      const match = buffer.detections.find(
        (detection) => detection.label === label,
      );
      if (match) print(detectionLine(label, match.confidence), "ok");
    });
    // Reacting to freshLabels only: detections churn every frame and would
    // otherwise re-log the same object several times a second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buffer.freshLabels, scanning, print]);

  // --- camera faults -----------------------------------------------------

  const { fault: cameraFault, clearFault } = camera;

  useEffect(() => {
    if (!cameraFault) return;
    setScanning(false);
    print(`CAMERA FAULT: ${cameraFault.message}`, "error");
    onFault(cameraFault);
    clearFault();
  }, [cameraFault, clearFault, onFault, print]);

  // --- operator actions --------------------------------------------------

  const startScanning = useCallback(async () => {
    print("INITIALIZING CAMERA\u2026");
    const opened = camera.active ? true : await camera.start();
    if (!opened) return;

    print("CONNECTING TO NEURAL NETWORK\u2026");
    print("SCANNING REALITY\u2026", "ok");
    setScanning(true);
  }, [camera, print]);

  const stopScanning = useCallback(() => {
    setScanning(false);
    camera.stop();
    resetDetections();
    print("SCAN HALTED. Reality left unexamined.", "warn");
  }, [camera, resetDetections, print]);

  const flipCamera = useCallback(async () => {
    resetDetections();
    print("SWITCHING OPTICAL INPUT\u2026");
    await camera.flip();
  }, [camera, resetDetections, print]);

  const toggleFit = useCallback(() => {
    const next: ObjectFit = fit === "contain" ? "cover" : "contain";
    setFit(next);
    print(
      next === "contain"
        ? "VIEW: WHOLE FRAME. Nothing escapes."
        : "VIEW: FILL SCREEN. Edges cropped.",
    );
  }, [fit, print]);

  useEffect(() => {
    onScanningChange?.(scanning);
  }, [scanning, onScanningChange]);

  // --- status ------------------------------------------------------------

  const status = (() => {
    if (camera.starting) return "REQUESTING CAMERA ACCESS";
    if (!camera.active) return "IDLE \u2014 SCANNER STOPPED";
    if (!scanning) return "CAMERA LIVE \u2014 NOT SCANNING";
    if (buffer.detections.length === 0) return "SCANNING REALITY";
    return `IDENTIFIED: ${buffer.detections[0].label.toUpperCase()}`;
  })();

  return (
    <div className={styles.scanner}>
      <header className={styles.banner}>
        <div>
          <p className={styles.wordmark}>WHATS DIS?</p>
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
            scanning={scanning}
            starting={camera.starting}
            mirrored={camera.mirrored}
            fit={fit}
            detections={buffer.detections}
            frame={buffer.frame}
            resolution={resolution}
          />

          <div className={styles.controls}>
            {scanning ? (
              <Button variant="stop" size="large" icon={"\u25A0"} onClick={stopScanning}>
                Stop scanning
              </Button>
            ) : (
              <Button
                variant="start"
                size="large"
                icon={"\u25B6"}
                onClick={startScanning}
                disabled={camera.starting}
              >
                {camera.starting ? "Opening camera\u2026" : "Start scanning"}
              </Button>
            )}

            {camera.hasMultipleCameras ? (
              <Button onClick={flipCamera} disabled={!camera.active}>
                Flip camera
              </Button>
            ) : null}

            <Button onClick={toggleFit}>
              {fit === "contain" ? "Fill screen" : "Whole frame"}
            </Button>

            <Button onClick={clearLog}>Clear log</Button>
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
              Objects ({buffer.detections.length})
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
            <DetectionPanel detections={buffer.detections} scanning={scanning} />
          </div>

          <div
            className={`${styles.sideBottom} ${panel === "console" ? "" : styles.sideHidden}`}
          >
            <ConsolePanel lines={log.lines} live={scanning} />
          </div>
        </div>
      </div>

      <StatusStrip
        status={status}
        link={link}
        fps={stats.fps}
        latencyMs={stats.latencyMs}
        inferenceMs={stats.inferenceMs}
        modelName={modelName}
        objectCount={buffer.detections.length}
      />
    </div>
  );
}
