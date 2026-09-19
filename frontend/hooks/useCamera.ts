"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { SystemFault } from "@/lib/types";

export type FacingMode = "user" | "environment";

export interface CameraApi {
  videoRef: RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  active: boolean;
  starting: boolean;
  facingMode: FacingMode;
  /** True when the preview is flipped, i.e. a front-facing camera. */
  mirrored: boolean;
  hasMultipleCameras: boolean;
  fault: SystemFault | null;
  start: (mode?: FacingMode) => Promise<boolean>;
  stop: () => void;
  flip: () => Promise<void>;
  clearFault: () => void;
}

/** Turns a DOMException from getUserMedia into something a human can act on. */
function describeFault(error: unknown): SystemFault {
  const name = error instanceof DOMException ? error.name : "";

  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return {
        title: "Camera access denied",
        message: "The browser refused the camera request.",
        hint: "Allow camera access for this site in your browser settings, then start the scanner again.",
      };
    case "NotFoundError":
    case "OverconstrainedError":
      return {
        title: "No camera found",
        message: "No video input device matched the request.",
        hint: "Connect a camera, or try the other lens if this device has one.",
      };
    case "NotReadableError":
      return {
        title: "Camera is busy",
        message: "Another application is already using the camera.",
        hint: "Close any other app or browser tab holding the camera, then try again.",
      };
    default:
      return {
        title: "Camera failed to start",
        message:
          error instanceof Error ? error.message : "The camera could not be opened.",
        hint: "Reload the page and try again. Camera access requires HTTPS or localhost.",
      };
  }
}

export function useCamera(initialFacing: FacingMode = "environment"): CameraApi {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>(initialFacing);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [fault, setFault] = useState<SystemFault | null>(null);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStream(null);
  }, []);

  const start = useCallback(
    async (mode?: FacingMode) => {
      const requested = mode ?? facingMode;

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setFault({
          title: "Camera unsupported",
          message: "This browser does not expose the MediaDevices API.",
          hint: "Use a current version of Chrome, Edge, Firefox or Safari over HTTPS.",
        });
        return false;
      }

      setStarting(true);
      setFault(null);
      releaseStream();

      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: requested },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        streamRef.current = media;
        setStream(media);
        setFacingMode(requested);

        if (videoRef.current) {
          videoRef.current.srcObject = media;
          // Safari will not autoplay reliably without an explicit call.
          await videoRef.current.play().catch(() => undefined);
        }
        return true;
      } catch (error) {
        setFault(describeFault(error));
        releaseStream();
        return false;
      } finally {
        setStarting(false);
      }
    },
    [facingMode, releaseStream],
  );

  const stop = useCallback(() => {
    releaseStream();
  }, [releaseStream]);

  const flip = useCallback(async () => {
    const next: FacingMode = facingMode === "user" ? "environment" : "user";
    await start(next);
  }, [facingMode, start]);

  const clearFault = useCallback(() => setFault(null), []);

  // Only worth offering a flip control when there is something to flip to.
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    let cancelled = false;

    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        if (cancelled) return;
        const cameras = devices.filter((device) => device.kind === "videoinput");
        setHasMultipleCameras(cameras.length > 1);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [stream]);

  useEffect(() => releaseStream, [releaseStream]);

  return {
    videoRef,
    stream,
    active: stream !== null,
    starting,
    facingMode,
    mirrored: facingMode === "user",
    hasMultipleCameras,
    fault,
    start,
    stop,
    flip,
    clearFault,
  };
}
