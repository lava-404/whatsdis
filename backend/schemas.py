"""Wire format shared with the Next.js frontend."""

from pydantic import BaseModel, Field


class Box(BaseModel):
    """Bounding box in pixels, relative to the frame that was submitted."""

    x: float = Field(description="Left edge, in source-frame pixels.")
    y: float = Field(description="Top edge, in source-frame pixels.")
    width: float
    height: float


class Detection(BaseModel):
    label: str
    confidence: float = Field(ge=0.0, le=1.0)
    box: Box
    class_id: int


class FrameInfo(BaseModel):
    """Dimensions of the submitted frame, so the client can scale boxes."""

    width: int
    height: int


class DetectionResponse(BaseModel):
    detections: list[Detection]
    frame: FrameInfo
    inference_ms: float
    model_name: str


class HealthResponse(BaseModel):
    status: str
    model_name: str
    device: str
    classes: int
    warm: bool
