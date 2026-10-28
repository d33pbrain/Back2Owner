"""OCR module package for Back2Owner."""

from app.config import settings
from app.ocr.base import BaseOCREngine, OCRResult, OCRTextBlock, STUDENT_DOC_KEYWORDS
from app.ocr.paddle_engine import PaddleOCREngine
from app.ocr.mock_engine import MockOCREngine


def get_ocr_engine(engine_type: str = settings.OCR_ENGINE) -> BaseOCREngine:
    """Factory method to get the configured OCR engine."""
    if engine_type.lower() == "mock":
        return MockOCREngine()
    return PaddleOCREngine.get_instance()


__all__ = [
    "BaseOCREngine",
    "OCRResult",
    "OCRTextBlock",
    "PaddleOCREngine",
    "MockOCREngine",
    "STUDENT_DOC_KEYWORDS",
    "get_ocr_engine",
]
