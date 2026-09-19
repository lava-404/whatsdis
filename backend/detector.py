"""Thin, stateful wrapper around an ultralytics YOLO checkpoint.

The model is loaded once at process start and reused for every request.
Inference itself is blocking, so callers are expected to run `detect` in a
worker thread (see main.py).
"""

from __future__ import annotations

import io
import logging
import time

import numpy as np
from PIL import Image, ImageOps

from config import Settings
from schemas import Box, Detection, FrameInfo

logger = logging.getLogger(__name__)


class ModelNotReady(RuntimeError):
    """Raised when a frame arrives before the checkpoint has finished loading."""


class InvalidFrame(ValueError):
    """Raised when the uploaded bytes are not a decodable image."""


class Detector:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._model = None
        self._names: dict[int, str] = {}
        self._warm = False

    # -- lifecycle ---------------------------------------------------------

    def load(self) -> None:
        """Import and load the checkpoint. Slow; call once, at startup."""
        from ultralytics import YOLO  # imported lazily to keep startup readable

        logger.info("Loading YOLO checkpoint: %s", self._settings.model_path)
        model = YOLO(self._settings.model_path)
        if self._settings.device:
            model.to(self._settings.device)
        self._model = model
        self._names = dict(model.names)
        logger.info("Checkpoint ready with %d classes", len(self._names))

    def warm_up(self) -> None:
        """Run one throwaway inference so the first real frame isn't slow."""
        if self._model is None:
            return
        blank = np.zeros(
            (self._settings.image_size, self._settings.image_size, 3), dtype=np.uint8
        )
        self._predict(blank)
        self._warm = True
        logger.info("Warm-up inference complete")

    # -- introspection -----------------------------------------------------

    @property
    def ready(self) -> bool:
        return self._model is not None

    @property
    def warm(self) -> bool:
        return self._warm

    @property
    def class_count(self) -> int:
        return len(self._names)

    @property
    def model_name(self) -> str:
        return self._settings.model_path

    @property
    def device(self) -> str:
        if self._model is None:
            return "unloaded"
        return str(getattr(self._model, "device", self._settings.device or "auto"))

    # -- inference ---------------------------------------------------------

    def detect(self, payload: bytes) -> tuple[list[Detection], FrameInfo, float]:
        if self._model is None:
            raise ModelNotReady("Checkpoint is still loading")

        frame = self._decode(payload)
        height, width = frame.shape[:2]

        started = time.perf_counter()
        result = self._predict(frame)
        elapsed_ms = (time.perf_counter() - started) * 1000

        detections = self._to_detections(result)
        return detections, FrameInfo(width=width, height=height), elapsed_ms

    # -- internals ---------------------------------------------------------

    @staticmethod
    def _decode(payload: bytes) -> np.ndarray:
        try:
            image = Image.open(io.BytesIO(payload))
            # Phone cameras love EXIF rotation; honour it before measuring.
            image = ImageOps.exif_transpose(image)
            image = image.convert("RGB")
        except Exception as exc:  # noqa: BLE001 - any decode failure is the same
            raise InvalidFrame("Frame could not be decoded as an image") from exc
        return np.asarray(image)

    def _predict(self, frame: np.ndarray):
        settings = self._settings
        results = self._model.predict(  # type: ignore[union-attr]
            source=frame,
            conf=settings.confidence_threshold,
            iou=settings.iou_threshold,
            imgsz=settings.image_size,
            max_det=settings.max_detections,
            device=settings.device or None,
            verbose=False,
        )
        return results[0]

    def _to_detections(self, result) -> list[Detection]:
        boxes = getattr(result, "boxes", None)
        if boxes is None or len(boxes) == 0:
            return []

        xyxy = boxes.xyxy.cpu().numpy()
        confidences = boxes.conf.cpu().numpy()
        class_ids = boxes.cls.cpu().numpy().astype(int)

        detections: list[Detection] = []
        for (x1, y1, x2, y2), confidence, class_id in zip(
            xyxy, confidences, class_ids
        ):
            detections.append(
                Detection(
                    label=self._names.get(int(class_id), f"class_{class_id}"),
                    confidence=round(float(confidence), 4),
                    class_id=int(class_id),
                    box=Box(
                        x=round(float(x1), 2),
                        y=round(float(y1), 2),
                        width=round(float(x2 - x1), 2),
                        height=round(float(y2 - y1), 2),
                    ),
                )
            )

        detections.sort(key=lambda d: d.confidence, reverse=True)
        return detections[: self._settings.max_detections]
