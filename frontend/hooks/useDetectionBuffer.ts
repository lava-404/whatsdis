"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DETECTION_TTL_MS } from "@/lib/config";
import type { Detection, DetectionResponse, FrameInfo } from "@/lib/types";

export interface TrackedDetection extends Detection {
  /** Stable across frames for the same label+slot, so React can animate boxes. */
  key: string;
  /** Milliseconds since this detection was last confirmed by the backend. */
  ageMs: number;
}

export interface DetectionBuffer {
  detections: TrackedDetection[];
  frame: FrameInfo | null;
  /** Labels seen for the first time in the most recent response. */
  freshLabels: string[];
  ingest: (result: DetectionResponse) => void;
  reset: () => void;
}

interface Entry extends Detection {
  key: string;
  seenAt: number;
}

/**
 * Holds detections for a short window after they stop being reported.
 *
 * Detection is per-frame and slightly noisy: an object the model is sure about
 * will still vanish for a single frame. Without this, every box strobes.
 */
export function useDetectionBuffer(): DetectionBuffer {
  const entriesRef = useRef<Entry[]>([]);
  const previousLabels = useRef<Set<string>>(new Set());

  const [detections, setDetections] = useState<TrackedDetection[]>([]);
  const [frame, setFrame] = useState<FrameInfo | null>(null);
  const [freshLabels, setFreshLabels] = useState<string[]>([]);

  const publish = useCallback(() => {
    const now = performance.now();
    const live = entriesRef.current.filter(
      (entry) => now - entry.seenAt < DETECTION_TTL_MS,
    );
    entriesRef.current = live;
    setDetections(
      live.map((entry) => ({
        key: entry.key,
        label: entry.label,
        confidence: entry.confidence,
        class_id: entry.class_id,
        box: entry.box,
        ageMs: now - entry.seenAt,
      })),
    );
  }, []);

  const ingest = useCallback(
    (result: DetectionResponse) => {
      const now = performance.now();
      const counters = new Map<string, number>();

      const incoming: Entry[] = result.detections.map((detection) => {
        const index = counters.get(detection.label) ?? 0;
        counters.set(detection.label, index + 1);
        return { ...detection, key: `${detection.label}-${index}`, seenAt: now };
      });

      const incomingKeys = new Set(incoming.map((entry) => entry.key));
      const held = entriesRef.current.filter(
        (entry) => !incomingKeys.has(entry.key) && now - entry.seenAt < DETECTION_TTL_MS,
      );

      entriesRef.current = [...incoming, ...held];
      setFrame(result.frame);

      const labels = new Set(result.detections.map((detection) => detection.label));
      const fresh = [...labels].filter((label) => !previousLabels.current.has(label));
      previousLabels.current = labels;
      setFreshLabels(fresh);

      publish();
    },
    [publish],
  );

  const reset = useCallback(() => {
    entriesRef.current = [];
    previousLabels.current = new Set();
    setDetections([]);
    setFreshLabels([]);
  }, []);

  // Expire held boxes even when no new responses are arriving.
  useEffect(() => {
    const timer = window.setInterval(publish, DETECTION_TTL_MS / 2);
    return () => window.clearInterval(timer);
  }, [publish]);

  return { detections, frame, freshLabels, ingest, reset };
}
