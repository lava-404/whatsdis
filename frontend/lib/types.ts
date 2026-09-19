export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  label: string;
  confidence: number;
  class_id: number;
  box: Box;
}

/** A detection with a render key attached, ready for the overlay. */
export interface KeyedDetection extends Detection {
  key: string;
}

export interface FrameInfo {
  width: number;
  height: number;
}

export interface DetectionResponse {
  detections: Detection[];
  frame: FrameInfo;
  inference_ms: number;
  model_name: string;
}

export interface HealthResponse {
  status: "ready" | "loading";
  model_name: string;
  device: string;
  classes: number;
  warm: boolean;
}

export type ConsoleTone = "info" | "ok" | "warn" | "error";

export interface ConsoleLine {
  id: number;
  text: string;
  tone: ConsoleTone;
}

/** A still frame taken from the camera, ready to analyse or export. */
export interface Snapshot {
  /** Object URL for display. Revoked when replaced. */
  url: string;
  blob: Blob;
  width: number;
  height: number;
  /** True when the preview was mirrored at capture time. */
  mirrored: boolean;
  takenAt: number;
}

/** Everything known about one completed analysis. */
export interface Analysis {
  snapshot: Snapshot;
  detections: KeyedDetection[];
  frame: FrameInfo;
  inferenceMs: number;
  roundTripMs: number;
}

export type Stage = "idle" | "live" | "analysing" | "result";

export interface SystemFault {
  title: string;
  message: string;
  hint?: string;
}
