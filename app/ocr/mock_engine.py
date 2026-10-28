"""Mock OCR Engine for ultra-fast, deterministic unit testing and offline CI."""

from typing import List, Optional
import numpy as np

from app.ocr.base import BaseOCREngine, OCRResult, OCRTextBlock, STUDENT_DOC_KEYWORDS


class MockOCREngine(BaseOCREngine):
    """Test engine that returns preset or simulated text without neural network inference."""

    def __init__(self, predefined_lines: Optional[List[tuple[str, float]]] = None):
        self.predefined_lines = predefined_lines or []

    def set_predefined_lines(self, lines: List[tuple[str, float]]):
        """Configure preset lines for subsequent OCR calls."""
        self.predefined_lines = lines

    def extract_text(self, image: np.ndarray) -> OCRResult:
        if image is None or image.size == 0 or not self.predefined_lines:
            return OCRResult(full_text="", average_confidence=0.0)

        blocks = [
            OCRTextBlock(text=text, confidence=score)
            for text, score in self.predefined_lines
        ]
        full_text = "\n".join(b.text for b in blocks)
        avg_conf = (
            float(sum(b.confidence for b in blocks) / len(blocks)) if blocks else 0.0
        )

        text_lower = full_text.lower()
        detected_keywords = [kw for kw in STUDENT_DOC_KEYWORDS if kw in text_lower]

        return OCRResult(
            blocks=blocks,
            full_text=full_text,
            average_confidence=avg_conf,
            detected_keywords=detected_keywords,
            has_student_card_keywords=len(detected_keywords) > 0,
        )
