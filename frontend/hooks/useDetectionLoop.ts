"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { detectObjects } from "@/lib/api";
import { captureFrame } from "@/lib/capture";
import { DETECT_INTERVAL_MS } from "@/lib/config";
import type { DetectionResponse } from "@/lib/types";

export interface DetectionLoopOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  onResult: (result: DetectionResponse) => void;
  onFailure: (error: unknown, consecutiveFailures: number) => void;
  onRecover?: () => void;
}

export interface LoopStats {
  /** Round trip for the last completed frame, in milliseconds. */
  latencyMs: number | null;
  /** Server-side inference time for the last completed frame. */
  inferenceMs: number | null;
  /** Frames actually completed per second, smoothed. */
  fps: number;
  /** Frames sent since the loop last started. */
  framesSent: number;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

/**
 * Submits frames to the backend on a request-driven cadence.
 *
 * The next frame is only captured after the previous response lands, and never
 * sooner than DETECT_INTERVAL_MS after the previous one started. That keeps
 * exactly one request in flight regardless of how slow the model is, so a
 * struggling backend degrades to a lower frame rate instead of a queue of
 * hundreds of stale frames.
 */
export function useDetectionLoop({
  videoRef,
  enabled,
  onResult,
  onFailure,
  onRecover,
}: DetectionLoopOptions): LoopStats {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stats, setStats] = useState<LoopStats>({
    latencyMs: null,
    inferenceMs: null,
    fps: 0,
    framesSent: 0,
  });

  // Callbacks are held in refs so a parent re-render never restarts the loop.
  const handlers = useRef({ onResult, onFailure, onRecover });
  handlers.current = { onResult, onFailure, onRecover };

  useEffect(() => {
    if (!enabled) {
      setStats({ latencyMs: null, inferenceMs: null, fps: 0, framesSent: 0 });
      return;
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;

    let cancelled = false;
    let failures = 0;
    let frames = 0;
    let smoothedFps = 0;
    const controller = new AbortController();

    const run = async () => {
      while (!cancelled) {
        const startedAt = performance.now();

        // A hidden tab gets no camera frames worth scanning; idle instead of
        // hammering the backend with stale or black images.
        if (document.visibilityState === "hidden") {
          await sleep(500);
          continue;
        }

        const video = videoRef.current;
        if (!video || video.readyState < 2) {
          await sleep(120);
          continue;
        }

        try {
          const blob = await captureFrame(video, canvas);
          if (cancelled) break;

          if (blob) {
            const result = await detectObjects(blob, controller.signal);
            if (cancelled) break;

            const latencyMs = performance.now() - startedAt;
            const instantFps = latencyMs > 0 ? 1000 / Math.max(latencyMs, DETECT_INTERVAL_MS) : 0;
            smoothedFps = smoothedFps === 0 ? instantFps : smoothedFps * 0.7 + instantFps * 0.3;
            frames += 1;

            if (failures > 0) {
              failures = 0;
              handlers.current.onRecover?.();
            }

            handlers.current.onResult(result);
            setStats({
              latencyMs: Math.round(latencyMs),
              inferenceMs: Math.round(result.inference_ms),
              fps: Math.round(smoothedFps * 10) / 10,
              framesSent: frames,
            });
          }
        } catch (error) {
          if (cancelled || (error instanceof DOMException && error.name === "AbortError")) {
            break;
          }
          failures += 1;
          handlers.current.onFailure(error, failures);
          // Back off so a downed backend isn't hit four times a second.
          await sleep(Math.min(4000, 400 * failures));
          continue;
        }

        const elapsed = performance.now() - startedAt;
        await sleep(Math.max(0, DETECT_INTERVAL_MS - elapsed));
      }
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, videoRef]);

  return stats;
}
