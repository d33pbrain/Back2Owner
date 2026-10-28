"""Base abstractions and data structures for OCR extraction."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional
import numpy as np


# Common keywords indicating a collegiate/university student document
STUDENT_DOC_KEYWORDS = {
    "student",
    "university",
    "college",
    "campus",
    "matric",
    "matriculation",
    "faculty",
    "undergraduate",
    "postgraduate",
    "graduate",
    "enrolment",
    "enrollment",
    "academic",
    "institute",
    "polytechnic",
    "student id",
}


@dataclass
class OCRTextBlock:
    """An individual line or token detected by OCR."""
    text: str
    confidence: float
    box: Optional[List[List[int]]] = None

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "confidence": round(self.confidence, 4),
            "box": self.box,
        }


@dataclass
class OCRResult:
    """Aggregated OCR extraction output."""
    blocks: List[OCRTextBlock] = field(default_factory=list)
    full_text: str = ""
    average_confidence: float = 0.0
    detected_keywords: List[str] = field(default_factory=list)
    has_student_card_keywords: bool = False

    def to_dict(self) -> dict:
        return {
            "full_text": self.full_text,
            "line_count": len(self.blocks),
            "average_confidence": round(self.average_confidence, 4),
            "detected_keywords": self.detected_keywords,
            "has_student_card_keywords": self.has_student_card_keywords,
            "lines": [b.to_dict() for b in self.blocks],
        }


class BaseOCREngine(ABC):
    """Abstract OCR engine interface."""

    @abstractmethod
    def extract_text(self, image: np.ndarray) -> OCRResult:
        """Extract text blocks from an image."""
        pass
