"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { checkHealth } from "@/lib/api";
import { LIVE_HINT, PRODUCT_NAME, detectionLine } from "@/lib/copy";
import { downloadAnnotatedSnapshot, summariseAnalysis } from "@/lib/export";
import type { ObjectFit } from "@/lib/geometry";
import type { Stage, SystemFault } from "@/lib/types";
import { useAnalysis } from "@/hooks/useAnalysis";
import type { AnalysisApi } from "@/hooks/useAnalysis";
import { useCamera } from "@/hooks/useCamera";
import type { CameraApi } from "@/hooks/useCamera";
import { useConsole } from "@/hooks/useConsole";
import type { ConsoleApi } from "@/hooks/useConsole";
import type { LinkState } from "./StatusStrip";

export interface DialogState extends SystemFault {
  tone: "error" | "info";
}

interface ScannerContextValue {
  camera: CameraApi;
  shot: AnalysisApi;
  log: ConsoleApi;

  stage: Stage;
  status: string;
  link: LinkState;
  modelName: string;
  resolution: string;
  shots: number;

  fit: ObjectFit;
  toggleFit: () => void;
  scanlines: boolean;
  toggleScanlines: () => void;

  dialog: DialogState | null;
  showDialog: (dialog: DialogState) => void;
  closeDialog: () => void;

  startCamera: () => Promise<void>;
  stopCamera: () => void;
  flipCamera: () => Promise<void>;
  takeShot: () => Promise<void>;
  retake: () => void;
  saveSnapshot: () => Promise<void>;
  copyResults: () => Promise<void>;
}

const ScannerContext = createContext<ScannerContextValue | null>(null);

export function useScanner(): ScannerContextValue {
  const value = useContext(ScannerContext);
  if (!value) {
    throw new Error("useScanner must be used inside a ScannerProvider.");
  }
  return value;
}

export function ScannerProvider({ children }: { children: ReactNode }) {
  const camera = useCamera("environment");
  const log = useConsole([`${PRODUCT_NAME} ready. Awaiting operator input.`]);

  const [fit, setFit] = useState<ObjectFit>("contain");
  const [link, setLink] = useState<LinkState>("busy");
  const [modelName, setModelName] = useState("yolo");
  const [resolution, setResolution] = useState("--");
  const [shots, setShots] = useState(0);
  const [scanlines, setScanlines] = useState(true);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const { print } = log;

  const showDialog = useCallback((next: DialogState) => setDialog(next), []);
  const closeDialog = useCallback(() => setDialog(null), []);

  // --- analysis ----------------------------------------------------------

  const handleFailure = useCallback(
    (error: unknown) => {
      const reason = error instanceof Error ? error.message : "unknown fault";
      setLink("offline");
      print(`ANALYSIS FAILED: ${reason}`, "error");
      showDialog({
        title: "Neural link lost",
        message: "The detection service did not answer.",
        hint: `Last error: ${reason}. Check that the Python backend is running and reachable, then take the shot again.`,
        tone: "error",
      });
    },
    [print, showDialog],
  );

  const shot = useAnalysis({
    videoRef: camera.videoRef,
    mirrored: camera.mirrored,
    onFailure: handleFailure,
  });

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

  const { videoRef, stream } = camera;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) {
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
  }, [stream, videoRef]);

  // --- camera faults -----------------------------------------------------

  const { fault: cameraFault, clearFault } = camera;

  useEffect(() => {
    if (!cameraFault) return;
    print(`CAMERA FAULT: ${cameraFault.message}`, "error");
    showDialog({ ...cameraFault, tone: "error" });
    clearFault();
  }, [cameraFault, clearFault, print, showDialog]);

  // --- narrate results ---------------------------------------------------

  const result = shot.analysis;

  useEffect(() => {
    if (!result) return;

    if (result.detections.length === 0) {
      print("ANALYSIS COMPLETE. Nothing recognised in that frame.", "warn");
      return;
    }

    print(
      `ANALYSIS COMPLETE in ${Math.round(result.inferenceMs)}ms \u2014 ${result.detections.length} object(s)`,
      "ok",
    );
    result.detections.forEach((detection) => {
      print(detectionLine(detection.label, detection.confidence), "ok");
    });
  }, [result, print]);

  // --- operator actions --------------------------------------------------

  const startCamera = useCallback(async () => {
    print("INITIALIZING CAMERA\u2026");
    const opened = await camera.start();
    if (opened) print(`CAMERA LIVE. ${LIVE_HINT}`, "ok");
  }, [camera, print]);

  const stopCamera = useCallback(() => {
    shot.clear();
    camera.stop();
    print("CAMERA OFF. Reality left unexamined.", "warn");
  }, [camera, print, shot]);

  const flipCamera = useCallback(async () => {
    shot.clear();
    print("SWITCHING OPTICAL INPUT\u2026");
    await camera.flip();
  }, [camera, print, shot]);

  const takeShot = useCallback(async () => {
    if (!camera.active || shot.busy) return;
    setShots((count) => count + 1);
    print("CAPTURING FRAME\u2026");
    print("TRANSMITTING TO NEURAL NETWORK\u2026");
    await shot.capture();
    setLink("online");
  }, [camera.active, print, shot]);

  const retake = useCallback(() => {
    shot.clear();
    print("FRAME DISCARDED. Back to live view.");
  }, [print, shot]);

  const toggleFit = useCallback(() => {
    const next: ObjectFit = fit === "contain" ? "cover" : "contain";
    setFit(next);
    print(
      next === "contain"
        ? "VIEW: WHOLE FRAME. Nothing escapes."
        : "VIEW: FILL SCREEN. Edges cropped.",
    );
  }, [fit, print]);

  const toggleScanlines = useCallback(() => {
    const next = !scanlines;
    setScanlines(next);
    print(next ? "CRT EMULATION ON." : "CRT EMULATION OFF. Suddenly it is 2011.");
  }, [print, scanlines]);

  const saveSnapshot = useCallback(async () => {
    if (!result) return;
    try {
      const stamp = new Date(result.snapshot.takenAt)
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      await downloadAnnotatedSnapshot(result, `name-that-shi-${stamp}.png`);
      print("SNAPSHOT SAVED with boxes burned in.", "ok");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown fault";
      print(`SAVE FAILED: ${reason}`, "error");
    }
  }, [print, result]);

  const copyResults = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(summariseAnalysis(result));
      print("RESULTS COPIED TO CLIPBOARD.", "ok");
    } catch {
      print("CLIPBOARD REFUSED. Your browser said no.", "warn");
    }
  }, [print, result]);

  // --- keyboard shortcuts ------------------------------------------------

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Never hijack a key the user aimed at a control or a text field.
      const target = event.target as HTMLElement | null;
      if (target && target !== document.body && target.closest("button, input, textarea, [contenteditable]")) {
        return;
      }

      if (event.code === "Space" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        if (shot.snapshot && !shot.busy) void retake();
        else void takeShot();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveSnapshot();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [retake, saveSnapshot, shot.busy, shot.snapshot, takeShot]);

  // --- derived -----------------------------------------------------------

  const stage: Stage = !camera.active
    ? "idle"
    : shot.busy
      ? "analysing"
      : shot.snapshot
        ? "result"
        : "live";

  const status = (() => {
    if (camera.starting) return "REQUESTING CAMERA ACCESS";
    if (stage === "idle") return "IDLE \u2014 CAMERA OFF";
    if (stage === "analysing") return "ANALYSING FRAME";
    if (stage === "live") return "CAMERA LIVE \u2014 READY TO SHOOT";
    if (!result || result.detections.length === 0) return "NOTHING IDENTIFIED";
    return `IDENTIFIED: ${result.detections[0].label.toUpperCase()}`;
  })();

  const value = useMemo<ScannerContextValue>(
    () => ({
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
      toggleScanlines,
      dialog,
      showDialog,
      closeDialog,
      startCamera,
      stopCamera,
      flipCamera,
      takeShot,
      retake,
      saveSnapshot,
      copyResults,
    }),
    [
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
      toggleScanlines,
      dialog,
      showDialog,
      closeDialog,
      startCamera,
      stopCamera,
      flipCamera,
      takeShot,
      retake,
      saveSnapshot,
      copyResults,
    ],
  );

  return (
    <ScannerContext.Provider value={value}>{children}</ScannerContext.Provider>
  );
}
