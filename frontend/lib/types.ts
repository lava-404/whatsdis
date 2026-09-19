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

export type ScannerState =
  | "idle"
  | "requesting-camera"
  | "ready"
  | "scanning"
  | "error";

export interface SystemFault {
  title: string;
  message: string;
  hint?: string;
}
