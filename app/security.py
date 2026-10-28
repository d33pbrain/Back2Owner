"""Security, privacy, and PII sanitization utilities for Back2Owner.

Complies with production privacy requirements:
1. No raw student names or PII emitted in application logs.
2. In-memory ephemeral processing with zero disk retention.
3. Magic-bytes header inspection to avoid MIME-spoofing attacks.
"""

import logging
import re
from typing import Optional, Tuple
import numpy as np
import cv2

from app.config import settings


# Magic byte signatures for supported image formats
MAGIC_NUMBERS = {
    "jpeg": [b"\xff\xd8\xff"],
    "png": [b"\x89PNG\r\n\x1a\n"],
    "webp": [b"RIFF"]  # WEBP has 'RIFF'....'WEBP'
}


def detect_image_format(data: bytes) -> Optional[str]:
    """Detect image format from raw bytes header, avoiding MIME-type spoofing."""
    if len(data) < 12:
        return None

    # Check JPEG
    if data.startswith(b"\xff\xd8\xff"):
        return "jpeg"

    # Check PNG
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"

    # Check WEBP
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "webp"

    return None


def mask_name(name: Optional[str]) -> str:
    """Mask student name for secure logging, e.g., 'Alexander Hamilton' -> 'A*** H***'."""
    if not name:
        return "[EMPTY]"
    parts = name.strip().split()
    masked_parts = []
    for p in parts:
        if len(p) <= 1:
            masked_parts.append(p)
        else:
            masked_parts.append(p[0] + "***")
    return " ".join(masked_parts)


def mask_text(text: Optional[str], max_visible_chars: int = 4) -> str:
    """Mask text content to prevent leaking extracted PII into logs."""
    if not text:
        return ""
    length = len(text)
    if length <= max_visible_chars:
        return "***"
    return f"{text[:2]}...({length} chars)...{text[-2:]}"


class PIIRedactionFilter(logging.Filter):
    """Logging filter that scrubs sensitive student data and patterns."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            # Scrub student ID-like patterns (e.g., S1234567, 202300192)
            record.msg = re.sub(r"\b[A-Z0-9]{7,12}\b", "[REDACTED_ID]", record.msg)
            # Scrub email addresses
            record.msg = re.sub(
                r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
                "[REDACTED_EMAIL]",
                record.msg,
            )
        return True


def decode_image_bytes(raw_bytes: bytes) -> Tuple[np.ndarray, str]:
    """Decode raw image bytes in memory into an OpenCV BGR numpy array.

    Raises:
        ValueError: If file format is invalid, corrupt, or exceeds limits.
    """
    if len(raw_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise ValueError(
            f"File size {len(raw_bytes)} bytes exceeds maximum allowed "
            f"{settings.MAX_UPLOAD_SIZE_BYTES} bytes."
        )

    if len(raw_bytes) < settings.MIN_UPLOAD_SIZE_BYTES:
        raise ValueError("Uploaded file is too small or empty to be a valid document image.")

    detected_format = detect_image_format(raw_bytes)
    if not detected_format or detected_format not in settings.ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported or unrecognized image format. "
            f"Expected one of: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    # Decode in memory without touching disk
    np_arr = np.frombuffer(raw_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if image is None or image.size == 0:
        raise ValueError("Image data is corrupted or could not be decoded.")

    h, w = image.shape[:2]
    if h > settings.MAX_IMAGE_DIMENSION or w > settings.MAX_IMAGE_DIMENSION:
        raise ValueError(
            f"Image dimensions {w}x{h} exceed maximum allowed dimension "
            f"{settings.MAX_IMAGE_DIMENSION}px."
        )

    return image, detected_format
