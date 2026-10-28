"""PaddleOCR engine implementation for Back2Owner.

Wraps PaddleOCR inference with thread-safety, oneDNN runtime stability,
and normalization into standard OCRResult blocks.
"""

import logging
import os
import threading
from typing import List, Optional
import numpy as np

from app.config import settings
from app.ocr.base import BaseOCREngine, OCRResult, OCRTextBlock, STUDENT_DOC_KEYWORDS

logger = logging.getLogger(__name__)

# Apply Paddle runtime stability environment variables
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"
os.environ["FLAGS_enable_pir_api"] = "0"
os.environ["FLAGS_use_onednn"] = "0"
os.environ["FLAGS_use_mkldnn"] = "0"

# Apply oneDNN patch to paddle.inference.create_predictor if available
_PATCH_APPLIED = False


def _ensure_onednn_safety():
    global _PATCH_APPLIED
    if _PATCH_APPLIED:
        return
    try:
        import paddle.inference as pi

        orig_create_predictor = pi.create_predictor

        def safe_create_predictor(config):
            if hasattr(config, "disable_onednn"):
                config.disable_onednn()
            if hasattr(config, "disable_mkldnn"):
                config.disable_mkldnn()
            return orig_create_predictor(config)

        pi.create_predictor = safe_create_predictor
        _PATCH_APPLIED = True
        logger.debug("Paddle oneDNN stability patch registered successfully.")
    except Exception as e:
        logger.warning(f"Could not apply Paddle oneDNN stability patch: {e}")


class PaddleOCREngine(BaseOCREngine):
    """Production wrapper for PaddleOCR with lazy loading and singleton instance."""

    _instance: Optional["PaddleOCREngine"] = None
    _lock = threading.Lock()

    def __init__(self, lang: str = settings.OCR_LANG, ocr_version: str = settings.OCR_VERSION):
        _ensure_onednn_safety()
        self.lang = lang
        self.ocr_version = ocr_version
        self._ocr = None
        self._init_lock = threading.Lock()

    @classmethod
    def get_instance(cls) -> "PaddleOCREngine":
        """Thread-safe singleton getter."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def _get_ocr_model(self):
        """Lazy load PaddleOCR model."""
        if self._ocr is None:
            with self._init_lock:
                if self._ocr is None:
                    try:
                        from paddleocr import PaddleOCR

                        logger.info(
                            f"Initializing PaddleOCR (version={self.ocr_version}, lang={self.lang})..."
                        )
                        self._ocr = PaddleOCR(
                            ocr_version=self.ocr_version,
                            lang=self.lang,
                        )
                        logger.info("PaddleOCR initialized successfully.")
                    except Exception as e:
                        logger.error(f"Failed to initialize PaddleOCR: {e}", exc_info=True)
                        raise
        return self._ocr

    def extract_text(self, image: np.ndarray) -> OCRResult:
        """Run OCR extraction on image numpy array."""
        if image is None or image.size == 0:
            return OCRResult()

        try:
            ocr = self._get_ocr_model()
            with self._init_lock:
                raw_output = ocr.predict(image)

            blocks: List[OCRTextBlock] = []

            for item in raw_output:
                if isinstance(item, dict):
                    # PaddleX / PaddleOCR 3.x format
                    texts = item.get("rec_texts", [])
                    scores = item.get("rec_scores", [])
                    polys = item.get("rec_polys", [])

                    for i, text in enumerate(texts):
                        clean_text = str(text).strip()
                        if not clean_text:
                            continue
                        score = float(scores[i]) if i < len(scores) else 0.0
                        box = (
                            polys[i].tolist()
                            if i < len(polys) and hasattr(polys[i], "tolist")
                            else None
                        )
                        blocks.append(OCRTextBlock(text=clean_text, confidence=score, box=box))

                elif isinstance(item, (list, tuple)):
                    # Traditional PaddleOCR format: [ [ [x,y]... ], (text, score) ]
                    for line in item:
                        if len(line) >= 2:
                            box = line[0] if isinstance(line[0], list) else None
                            text_score = line[1]
                            if isinstance(text_score, (list, tuple)) and len(text_score) >= 2:
                                clean_text = str(text_score[0]).strip()
                                score = float(text_score[1])
                                if clean_text:
                                    blocks.append(
                                        OCRTextBlock(text=clean_text, confidence=score, box=box)
                                    )

            # Build full text and compute averages
            lines_text = [b.text for b in blocks]
            full_text = "\n".join(lines_text)

            avg_conf = (
                float(sum(b.confidence for b in blocks) / len(blocks)) if blocks else 0.0
            )

            # Check for student card keywords
            text_lower = full_text.lower()
            detected_keywords = [
                kw for kw in STUDENT_DOC_KEYWORDS if kw in text_lower
            ]
            has_student_kw = len(detected_keywords) > 0

            return OCRResult(
                blocks=blocks,
                full_text=full_text,
                average_confidence=avg_conf,
                detected_keywords=detected_keywords,
                has_student_card_keywords=has_student_kw,
            )

        except Exception as e:
            logger.error(f"OCR inference encountered an error: {e}", exc_info=True)
            return OCRResult(full_text="", average_confidence=0.0)
