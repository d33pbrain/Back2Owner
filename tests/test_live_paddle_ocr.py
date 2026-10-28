"""Live PaddleOCR integration test on synthetic document image."""

import pytest
from tests.conftest import generate_synthetic_id_card
from app.preprocessing.pipeline import ImagePreprocessor
from app.ocr.paddle_engine import PaddleOCREngine
from app.matching.matcher import FieldMatcher
from app.decision.rules import DecisionRulesEngine, VerificationOutcome
from app.quality.assessor import ImageQualityAssessor


def test_live_paddle_ocr_full_pipeline():
    """Verify live PaddleOCR extraction, fuzzy matching, and decision rules."""
    img = generate_synthetic_id_card(
        university="METROPOLITAN UNIVERSITY",
        title="STUDENT IDENTITY CARD",
        name="Alex Morgan",
        department="Computer Science",
        student_id="STU-2024-8831",
    )

    quality = ImageQualityAssessor().assess(img)
    preprocessed = ImagePreprocessor().preprocess(img)

    ocr_engine = PaddleOCREngine.get_instance()
    ocr_res = ocr_engine.extract_text(preprocessed.image)

    assert len(ocr_res.blocks) > 0
    assert ocr_res.has_student_card_keywords
    assert ocr_res.average_confidence > 0.85

    lines = [b.text for b in ocr_res.blocks]
    matcher = FieldMatcher()
    name_res = matcher.match_name(lines, "Alex", "Morgan")
    dept_res = matcher.match_department(lines, "Computer Science")

    assert name_res.is_match
    assert dept_res.is_match

    decision = DecisionRulesEngine().evaluate(quality, ocr_res, name_res, dept_res)
    assert decision.outcome == VerificationOutcome.CHECKS_PASSED
    assert "verified successfully" in decision.summary_reason.lower()
