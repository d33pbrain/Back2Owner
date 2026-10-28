"""Decision rules engine for Back2Owner Document Verification.

Implements the three core outcomes:
- `checks_passed`: Quality is good, name & department match, student document keywords confirmed.
- `retake_required`: Technical image defect (blurry, dark, low-res, cropped) prevents reliable OCR.
- `manual_review`: Quality is adequate, but match is ambiguous, mismatched, or document is non-standard.

Strictly adheres to safety rules:
1. Never interprets missing or inconclusive OCR text as fraud.
2. Does not automatically assume university enrollment solely from OCR match.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional

from app.quality.assessor import QualityAssessmentResult
from app.ocr.base import OCRResult
from app.matching.matcher import NameMatchResult, DeptMatchResult


class VerificationOutcome(str, Enum):
    """The three possible verification outcomes."""
    CHECKS_PASSED = "checks_passed"
    RETAKE_REQUIRED = "retake_required"
    MANUAL_REVIEW = "manual_review"


DISCLAIMER_TEXT = (
    "Document visual and text checks passed. Note: This automated check verifies image "
    "legibility and detail correspondence only. Document authenticity and active student "
    "enrollment must be validated independently through an authoritative university database "
    "or registrar integration."
)


@dataclass
class DecisionResult:
    """Consolidated outcome and explanation."""
    outcome: VerificationOutcome
    summary_reason: str
    warnings: List[str] = field(default_factory=list)
    next_steps: str = ""
    disclaimer: str = DISCLAIMER_TEXT
    overall_confidence: float = 0.0

    def to_dict(self) -> dict:
        return {
            "outcome": self.outcome.value,
            "summary_reason": self.summary_reason,
            "warnings": self.warnings,
            "next_steps": self.next_steps,
            "disclaimer": self.disclaimer,
            "overall_confidence": round(self.overall_confidence, 2),
        }


class DecisionRulesEngine:
    """Evaluates quality, OCR, and match results into a definitive outcome."""

    def evaluate(
        self,
        quality: QualityAssessmentResult,
        ocr: OCRResult,
        name_match: NameMatchResult,
        dept_match: DeptMatchResult,
    ) -> DecisionResult:
        warnings = list(quality.quality_warnings)

        # -------------------------------------------------------------
        # 1. EVALUATE RETAKE CONDITIONS (Technical image capture defects)
        # -------------------------------------------------------------
        has_fatal_quality_defect = (
            quality.is_blurry
            or quality.is_dark
            or quality.is_overexposed
            or quality.is_low_resolution
            or quality.is_cropped
        )

        # If image had fatal defects OR produced zero readable text due to defect
        if has_fatal_quality_defect:
            reasons = []
            retake_tips = []

            if quality.is_blurry:
                reasons.append("Image is blurry and text cannot be accurately resolved.")
                retake_tips.append("Hold the camera steady or place the document on a flat surface.")
            if quality.is_dark:
                reasons.append("Image is underexposed or in poor lighting.")
                retake_tips.append("Take the photo in a brightly and evenly lit environment.")
            if quality.is_overexposed:
                reasons.append("Image has severe glare or overexposure.")
                retake_tips.append("Avoid direct flash or angle the card away from overhead glare.")
            if quality.is_low_resolution:
                reasons.append("Image resolution is too low for OCR.")
                retake_tips.append("Upload a higher-resolution photo without downsampling.")
            if quality.is_cropped:
                reasons.append("Document edges appear cropped or cut off at the frame boundary.")
                retake_tips.append("Ensure all 4 corners and borders of the ID card are fully visible.")

            summary = "Image capture quality is insufficient for verification: " + " ".join(reasons)
            next_steps = "Please retake and upload a clearer photo. Suggestions: " + " ".join(retake_tips)

            return DecisionResult(
                outcome=VerificationOutcome.RETAKE_REQUIRED,
                summary_reason=summary,
                warnings=warnings,
                next_steps=next_steps,
                overall_confidence=0.0,
            )

        # Handle unreadable image despite passing basic technical thresholds
        # SAFE RULE: Missing OCR text is never treated as fraud!
        if len(ocr.blocks) == 0 or len(ocr.full_text.strip()) < 5:
            warnings.append(
                "No readable text lines were extracted from the document."
            )
            return DecisionResult(
                outcome=VerificationOutcome.RETAKE_REQUIRED,
                summary_reason=(
                    "No readable text could be recognized. The document may be washed out, "
                    "covered, or heavily skewed."
                ),
                warnings=warnings,
                next_steps=(
                    "Please retake the photo ensuring the student card text is sharp, legible, "
                    "and unobstructed."
                ),
                overall_confidence=0.0,
            )

        # -------------------------------------------------------------
        # 2. EVALUATE DOCUMENT TYPE INDICATORS
        # -------------------------------------------------------------
        # Check if text reflects student / university credentials
        if not ocr.has_student_card_keywords:
            warnings.append(
                "Document does not contain standard student or university credential keywords."
            )

        # -------------------------------------------------------------
        # 3. CALCULATE COMBINED CONFIDENCE
        # -------------------------------------------------------------
        # Overall confidence is harmonic/weighted blend of name score, dept score, and OCR score
        ocr_conf_pct = ocr.average_confidence * 100.0
        overall_conf = (
            (name_match.score * 0.50)
            + (dept_match.score * 0.35)
            + (ocr_conf_pct * 0.15)
        )

        # -------------------------------------------------------------
        # 4. EVALUATE CHECKS_PASSED CRITERIA
        # -------------------------------------------------------------
        both_matched = name_match.is_match and dept_match.is_match
        is_student_doc = ocr.has_student_card_keywords

        if both_matched and is_student_doc and quality.is_acceptable_quality:
            return DecisionResult(
                outcome=VerificationOutcome.CHECKS_PASSED,
                summary_reason=(
                    "Document image quality and student credential details verified successfully."
                ),
                warnings=warnings,
                next_steps=(
                    "Automated preliminary checks completed. Proceed to authoritative university "
                    "enrollment verification."
                ),
                overall_confidence=overall_conf,
            )

        # -------------------------------------------------------------
        # 5. EVALUATE MANUAL REVIEW CRITERIA (Inconclusive or Discrepancies)
        # -------------------------------------------------------------
        review_reasons = []

        if not name_match.is_match:
            if name_match.is_borderline:
                review_reasons.append(
                    f"Student name partially matched ({name_match.score:.1f}% similarity). "
                    "Manual verification needed for name formatting or middle name variations."
                )
            else:
                review_reasons.append(
                    f"Student name did not match extracted document text ({name_match.score:.1f}% similarity)."
                )

        if not dept_match.is_match:
            if dept_match.is_borderline:
                review_reasons.append(
                    f"Department partially matched ({dept_match.score:.1f}% similarity). "
                    "Manual review needed for non-standard department abbreviations."
                )
            else:
                review_reasons.append(
                    f"Department did not match extracted document text ({dept_match.score:.1f}% similarity)."
                )

        if not is_student_doc:
            review_reasons.append(
                "Extracted text does not clearly indicate a recognized university or student ID document."
            )

        summary = "Verification requires manual review: " + " ".join(review_reasons)
        next_steps = (
            "This document has been routed to the Back2Owner manual review queue. "
            "A verification specialist will review the submitted evidence alongside "
            "university records."
        )

        return DecisionResult(
            outcome=VerificationOutcome.MANUAL_REVIEW,
            summary_reason=summary,
            warnings=warnings,
            next_steps=next_steps,
            overall_confidence=overall_conf,
        )
