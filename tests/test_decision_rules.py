"""Tests for decision rules engine."""

from app.decision.rules import DecisionRulesEngine, VerificationOutcome
from app.quality.assessor import QualityAssessmentResult
from app.ocr.base import OCRResult, OCRTextBlock
from app.matching.matcher import NameMatchResult, DeptMatchResult


def test_decision_checks_passed():
    engine = DecisionRulesEngine()

    quality = QualityAssessmentResult(
        blur_score=180.0,
        is_blurry=False,
        brightness_score=135.0,
        is_dark=False,
        is_overexposed=False,
        contrast_score=50.0,
        is_low_contrast=False,
        width=800,
        height=500,
        megapixels=0.4,
        is_low_resolution=False,
        is_cropped=False,
        crop_edge_density=0.01,
        is_acceptable_quality=True,
    )

    ocr = OCRResult(
        blocks=[
            OCRTextBlock("METROPOLITAN UNIVERSITY", 0.98),
            OCRTextBlock("STUDENT ID CARD", 0.99),
            OCRTextBlock("ALEX MORGAN", 0.95),
            OCRTextBlock("COMPUTER SCIENCE", 0.96),
        ],
        full_text="METROPOLITAN UNIVERSITY\nSTUDENT ID CARD\nALEX MORGAN\nCOMPUTER SCIENCE",
        average_confidence=0.97,
        detected_keywords=["university", "student", "id card"],
        has_student_card_keywords=True,
    )

    name_match = NameMatchResult(score=100.0, is_match=True)
    dept_match = DeptMatchResult(score=100.0, is_match=True)

    res = engine.evaluate(quality, ocr, name_match, dept_match)

    assert res.outcome == VerificationOutcome.CHECKS_PASSED
    assert "verified successfully" in res.summary_reason.lower()
    assert "authoritative university database" in res.disclaimer


def test_decision_retake_required_for_blurry_image():
    engine = DecisionRulesEngine()

    quality = QualityAssessmentResult(
        blur_score=35.0,
        is_blurry=True,
        brightness_score=135.0,
        is_dark=False,
        is_overexposed=False,
        contrast_score=50.0,
        is_low_contrast=False,
        width=800,
        height=500,
        megapixels=0.4,
        is_low_resolution=False,
        is_cropped=False,
        crop_edge_density=0.01,
        is_acceptable_quality=False,
        quality_warnings=["Image is blurry"],
    )

    ocr = OCRResult()
    name_match = NameMatchResult(score=0.0, is_match=False)
    dept_match = DeptMatchResult(score=0.0, is_match=False)

    res = engine.evaluate(quality, ocr, name_match, dept_match)

    assert res.outcome == VerificationOutcome.RETAKE_REQUIRED
    assert "retake" in res.next_steps.lower()
    assert any("blurry" in w.lower() for w in res.warnings)


def test_decision_retake_required_for_unreadable_text():
    engine = DecisionRulesEngine()

    quality = QualityAssessmentResult(
        blur_score=120.0,
        is_blurry=False,
        brightness_score=120.0,
        is_dark=False,
        is_overexposed=False,
        contrast_score=40.0,
        is_low_contrast=False,
        width=800,
        height=500,
        megapixels=0.4,
        is_low_resolution=False,
        is_cropped=False,
        crop_edge_density=0.01,
        is_acceptable_quality=True,
    )

    # OCR failed to extract any readable text
    ocr = OCRResult(blocks=[], full_text="", average_confidence=0.0)
    name_match = NameMatchResult(score=0.0, is_match=False)
    dept_match = DeptMatchResult(score=0.0, is_match=False)

    res = engine.evaluate(quality, ocr, name_match, dept_match)

    # Safe rule: missing text triggers retake_required, never fraud accusation!
    assert res.outcome == VerificationOutcome.RETAKE_REQUIRED
    assert "fraud" not in res.summary_reason.lower()
    assert "fraud" not in res.next_steps.lower()


def test_decision_manual_review_for_name_mismatch():
    engine = DecisionRulesEngine()

    quality = QualityAssessmentResult(
        blur_score=180.0,
        is_blurry=False,
        brightness_score=135.0,
        is_dark=False,
        is_overexposed=False,
        contrast_score=50.0,
        is_low_contrast=False,
        width=800,
        height=500,
        megapixels=0.4,
        is_low_resolution=False,
        is_cropped=False,
        crop_edge_density=0.01,
        is_acceptable_quality=True,
    )

    ocr = OCRResult(
        blocks=[
            OCRTextBlock("METROPOLITAN UNIVERSITY", 0.98),
            OCRTextBlock("STUDENT ID CARD", 0.99),
            OCRTextBlock("SARAH CONNOR", 0.95),
            OCRTextBlock("COMPUTER SCIENCE", 0.96),
        ],
        full_text="METROPOLITAN UNIVERSITY\nSTUDENT ID CARD\nSARAH CONNOR\nCOMPUTER SCIENCE",
        average_confidence=0.97,
        detected_keywords=["university", "student", "id card"],
        has_student_card_keywords=True,
    )

    # Submitted Alex Morgan, but card has Sarah Connor
    name_match = NameMatchResult(score=20.0, is_match=False)
    dept_match = DeptMatchResult(score=100.0, is_match=True)

    res = engine.evaluate(quality, ocr, name_match, dept_match)

    assert res.outcome == VerificationOutcome.MANUAL_REVIEW
    assert "manual review" in res.summary_reason.lower()
    # Safe language: no accusation of fraud
    assert "fraud" not in res.summary_reason.lower()
    assert "counterfeit" not in res.summary_reason.lower()


def test_decision_manual_review_for_non_student_document():
    engine = DecisionRulesEngine()

    quality = QualityAssessmentResult(
        blur_score=180.0,
        is_blurry=False,
        brightness_score=135.0,
        is_dark=False,
        is_overexposed=False,
        contrast_score=50.0,
        is_low_contrast=False,
        width=800,
        height=500,
        megapixels=0.4,
        is_low_resolution=False,
        is_cropped=False,
        crop_edge_density=0.01,
        is_acceptable_quality=True,
    )

    # Gym membership card text
    ocr = OCRResult(
        blocks=[
            OCRTextBlock("METRO FITNESS CLUB", 0.98),
            OCRTextBlock("CARDHOLDER: ALEX MORGAN", 0.95),
            OCRTextBlock("DEPT: FITNESS", 0.96),
        ],
        full_text="METRO FITNESS CLUB\nCARDHOLDER: ALEX MORGAN\nDEPT: FITNESS",
        average_confidence=0.96,
        detected_keywords=[],
        has_student_card_keywords=False,  # No student/university keywords
    )

    name_match = NameMatchResult(score=95.0, is_match=True)
    dept_match = DeptMatchResult(score=30.0, is_match=False)

    res = engine.evaluate(quality, ocr, name_match, dept_match)

    assert res.outcome == VerificationOutcome.MANUAL_REVIEW
