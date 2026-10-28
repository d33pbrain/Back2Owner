"""Configuration settings for Back2Owner Document Verification Service.

All thresholds and limits are fully configurable via environment variables.
"""

from typing import Set
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="B2O_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Service info
    SERVICE_NAME: str = "Back2Owner Student Document Verification"
    SERVICE_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "production"
    DEBUG: bool = False

    # Image upload limits
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    MIN_UPLOAD_SIZE_BYTES: int = 2 * 1024          # 2 KB (guards empty/corrupt files)
    ALLOWED_IMAGE_TYPES: Set[str] = {"image/jpeg", "image/png", "image/webp"}
    ALLOWED_EXTENSIONS: Set[str] = {"jpg", "jpeg", "png", "webp"}

    # Image dimension thresholds
    MIN_IMAGE_WIDTH: int = 320
    MIN_IMAGE_HEIGHT: int = 200
    MAX_IMAGE_DIMENSION: int = 6000  # guards against decompression bombs

    # Image quality thresholds
    BLUR_THRESHOLD: float = 90.0           # Laplacian variance; <90 flags blur
    MIN_BRIGHTNESS: float = 45.0          # Average luminance (0-255); <45 flags dark
    MAX_BRIGHTNESS: float = 230.0         # Average luminance (0-255); >230 flags glare/overexposure
    MIN_CONTRAST: float = 22.0            # Luminance standard deviation; <22 flags washed out
    CROP_BORDER_MARGIN_RATIO: float = 0.02 # Border strip check ratio (2% from edge)
    CROP_EDGE_DENSITY_THRESHOLD: float = 0.12 # Edge pixel density near image border indicating crop

    # OCR Engine settings
    OCR_ENGINE: str = "paddle"            # "paddle" or "mock"
    OCR_VERSION: str = "PP-OCRv4"
    OCR_LANG: str = "en"
    OCR_CONFIDENCE_THRESHOLD: float = 0.50

    # Matching thresholds (0 - 100)
    NAME_MATCH_THRESHOLD: float = 80.0
    NAME_BORDERLINE_THRESHOLD: float = 50.0
    DEPT_MATCH_THRESHOLD: float = 75.0
    DEPT_BORDERLINE_THRESHOLD: float = 50.0

    # Privacy & Logging
    MASK_PII_IN_LOGS: bool = True
    RETAIN_ORIGINAL_IMAGE: bool = False   # Ephemeral only; no disk storage


settings = Settings()
