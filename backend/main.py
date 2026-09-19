"""Name That Shi detection service.

Single endpoint: POST a JPEG still, get back labelled boxes in the coordinate
space of the image you sent. All scaling to screen space happens in the client.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from detector import Detector, InvalidFrame, ModelNotReady
from schemas import DetectionResponse, HealthResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s %(name)s  %(message)s",
)
logger = logging.getLogger("name-that-shi")

settings = get_settings()
detector = Detector(settings)
inference_slots = asyncio.Semaphore(settings.max_concurrent_inferences)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Loading happens off the event loop so the health endpoint answers
    # immediately and the UI can show an honest "connecting" state.
    await run_in_threadpool(detector.load)
    await run_in_threadpool(detector.warm_up)
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="Name That Shi Detection Service",
    version="1.0.0",
    summary="YOLO object detection for single stills captured in the browser.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ready" if detector.ready else "loading",
        model_name=detector.model_name,
        device=detector.device,
        classes=detector.class_count,
        warm=detector.warm,
    )


@app.post("/detect", response_model=DetectionResponse)
async def detect(request: Request, frame: UploadFile = File(...)) -> DetectionResponse:
    if frame.content_type and not frame.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload an image frame.",
        )

    payload = await frame.read()
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Empty frame."
        )
    if len(payload) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Frame exceeds {settings.max_upload_bytes} bytes.",
        )

    async with inference_slots:
        # The client aborts the previous request when a new shot is taken;
        # skip the work rather than burning a slot on a frame nobody will see.
        if await request.is_disconnected():
            raise HTTPException(status_code=499, detail="Client disconnected.")
        try:
            detections, frame_info, inference_ms = await run_in_threadpool(
                detector.detect, payload
            )
        except ModelNotReady as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
            ) from exc
        except InvalidFrame as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
            ) from exc
        except Exception as exc:  # noqa: BLE001
            logger.exception("Inference failed")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Inference failed.",
            ) from exc

    return DetectionResponse(
        detections=detections,
        frame=frame_info,
        inference_ms=round(inference_ms, 2),
        model_name=detector.model_name,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
