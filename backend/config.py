"""Runtime configuration for the Name That Shi detection service."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Values are read from the environment or a local .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_prefix="NTS_")

    # Any ultralytics checkpoint. yolov8n is the smallest and fastest, and is
    # downloaded automatically the first time the server starts.
    model_path: str = "yolov8n.pt"

    # "cpu", "cuda", "cuda:0", "mps". Empty lets ultralytics choose.
    device: str = ""

    # Detections below this score are dropped before the response is built.
    confidence_threshold: float = 0.35

    # Non-maximum suppression IoU threshold.
    iou_threshold: float = 0.45

    # Frames are letterboxed to this square before inference.
    image_size: int = 640

    # Hard cap on returned boxes, so the UI never has to draw 300 rectangles.
    max_detections: int = 20

    # Reject anything larger than this many bytes (default 6 MB).
    max_upload_bytes: int = 6 * 1024 * 1024

    # How many inferences may run at once. More than a couple just thrashes.
    max_concurrent_inferences: int = 2

    # Comma-separated list of allowed browser origins.
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
