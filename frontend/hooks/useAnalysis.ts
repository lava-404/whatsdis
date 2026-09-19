"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { detectObjects } from "@/lib/api";
import { releaseSnapshot, takeSnapshot } from "@/lib/capture";
import { SHUTTER_FLASH_MS } from "@/lib/config";
import type { Analysis, KeyedDetection, Snapshot } from "@/lib/types";

export interface AnalysisApi {
  /** The completed result, or null when there is nothing to show. */
  analysis: Analysis | null;
  /** The frozen still, available the instant the shutter fires. */
  snapshot: Snapshot | null;
  busy: boolean;
  flashing: boolean;
  capture: () => Promise<void>;
  clear: () => void;
}

interface AnalysisOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  mirrored: boolean;
  onFailure: (error: unknown) => void;
}

/**
 * One shot, one request.
 *
 * The still is shown the moment the shutter fires, before the network has
 * answered, so the frame the user framed is the frame they keep looking at.
 * Boxes then land on a static image rather than chasing a moving preview.
 */
export function useAnalysis({
  videoRef,
  mirrored,
  onFailure,
}: AnalysisOptions): AnalysisApi {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [flashing, setFlashing] = useState(false);

  const snapshotRef = useRef<Snapshot | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const failureRef = useRef(onFailure);
  failureRef.current = onFailure;

  const replaceSnapshot = useCallback((next: Snapshot | null) => {
    releaseSnapshot(snapshotRef.current);
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);

  const capture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || busy) return;

    // Any previous request is now answering a question nobody is asking.
    requestRef.current?.abort();

    const still = await takeSnapshot(video, mirrored);
    if (!still) {
      failureRef.current(new Error("The camera did not return a frame."));
      return;
    }

    replaceSnapshot(still);
    setAnalysis(null);
    setBusy(true);
    setFlashing(true);
    window.setTimeout(() => setFlashing(false), SHUTTER_FLASH_MS);

    const controller = new AbortController();
    requestRef.current = controller;
    const startedAt = performance.now();

    try {
      const response = await detectObjects(still.blob, controller.signal);
      const counters = new Map<string, number>();
      const detections: KeyedDetection[] = response.detections.map((detection) => {
        const index = counters.get(detection.label) ?? 0;
        counters.set(detection.label, index + 1);
        return { ...detection, key: `${detection.label}-${index}` };
      });

      setAnalysis({
        snapshot: still,
        detections,
        frame: response.frame,
        inferenceMs: response.inference_ms,
        roundTripMs: performance.now() - startedAt,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      failureRef.current(error);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setBusy(false);
      }
    }
  }, [busy, mirrored, replaceSnapshot, videoRef]);

  const clear = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    setBusy(false);
    setAnalysis(null);
    replaceSnapshot(null);
  }, [replaceSnapshot]);

  useEffect(
    () => () => {
      requestRef.current?.abort();
      releaseSnapshot(snapshotRef.current);
    },
    [],
  );

  return { analysis, snapshot, busy, flashing, capture, clear };
}
