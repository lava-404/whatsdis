import { CAPTURE_MAX_EDGE, CAPTURE_QUALITY } from "./config";

/**
 * Draws the current video frame to a canvas and encodes it as JPEG.
 *
 * The canvas is owned by the caller and reused across frames — allocating a
 * new one several times a second is exactly the kind of thing that makes a
 * "real-time" demo stutter.
 */
export async function captureFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): Promise<Blob | null> {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;

  if (!sourceWidth || !sourceHeight || video.readyState < 2) return null;

  const scale = Math.min(1, CAPTURE_MAX_EDGE / Math.max(sourceWidth, sourceHeight));
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return null;

  // The frame is never mirrored here. The preview flip is presentation only;
  // the model and the projection maths both work in raw camera space.
  context.drawImage(video, 0, 0, width, height);

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", CAPTURE_QUALITY);
  });
}
