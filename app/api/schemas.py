"""Pydantic schemas for Back2Owner Document Verification API."""

from typing import List, Optional
from pydantic import BaseModel, Field

from app.decision.rules import VerificationOutcome


class ImageQualitySummary(BaseModel):
    """Image technical quality metrics and flags."""
    blur_score: float = Field(..., description="Variance of Laplacian focus score")
    is_blurry: bool = Field(..., description="Whether image is flagged as blurry")
    brightness_score: float = Field(..., description="Mean luminance value (0-255)")
    is_dark: bool = Field(..., description="Whether image is underexposed")
    is_overexposed: bool = Field(..., description="Whether image is overexposed or has glare")
    contrast_score: float = Field(..., description="Standard deviation of luminance")
    is_low_contrast: bool = Field(..., description="Whether image has low contrast")
    width: int = Field(..., description="Image width in pixels")
    height: int = Field(..., description="Image height in pixels")
    megapixels: float = Field(..., description="Total megapixels")
    is_low_resolution: bool = Field(..., description="Whether resolution is below required threshold")
    is_cropped: bool = Field(..., description="Whether document appears cropped at borders")
    crop_edge_density: float = Field(..., description="Edge pixel density along image boundaries")
    is_acceptable_quality: bool = Field(..., description="Whether overall quality meets criteria")


class OCRLineBlock(BaseModel):
    """An individual extracted line with OCR score."""
    text: str
    confidence: float
    box: Optional[List[List[int]]] = None


class ExtractedTextFields(BaseModel):
    """Information extracted by OCR."""
    raw_text: str = Field(..., description="Complete extracted document text")
    line_count: int = Field(..., description="Number of text lines detected")
    average_ocr_confidence: float = Field(..., description="Mean OCR confidence score (0-1)")
    student_document_keywords_found: List[str] = Field(
        default_factory=list, description="Collegiate/student keywords detected"
    )
    is_student_document_suspected: bool = Field(
        ..., description="Whether extracted text contains student ID indicators"
    )
    lines: List[OCRLineBlock] = Field(
        default_factory=list, description="Extracted line blocks with scores"
    )


class MatchConfidence(BaseModel):
    """Fuzzy matching evaluation of submitted student fields."""
    name_score: float = Field(..., description="First and last name similarity score (0-100)")
    name_matched_text: str = Field(..., description="Text segment on document matched to name")
    name_match_method: str = Field(..., description="Algorithm used (token_set, token_sort, initials)")
    name_is_match: bool = Field(..., description="Whether name exceeds match threshold")
    department_score: float = Field(..., description="Department similarity score (0-100)")
    department_matched_text: str = Field(..., description="Text segment on document matched to department")
    department_alias_used: Optional[str] = Field(None, description="Department alias or acronym matched")
    department_match_method: str = Field(..., description="Algorithm used for department match")
    department_is_match: bool = Field(..., description="Whether department exceeds match threshold")
    overall_confidence: float = Field(..., description="Weighted composite confidence percentage (0-100)")


class VerificationResponse(BaseModel):
    """Complete structured response for student document verification."""
    request_id: str = Field(..., description="Unique request tracing ID")
    outcome: VerificationOutcome = Field(
        ..., description="One of: 'checks_passed', 'retake_required', or 'manual_review'"
    )
    summary_reason: str = Field(..., description="Human-readable decision explanation")
    quality: ImageQualitySummary = Field(..., description="Image quality breakdown")
    extracted_fields: ExtractedTextFields = Field(..., description="OCR text and tokens")
    match_confidence: MatchConfidence = Field(..., description="Field match analysis")
    applied_preprocessing: List[str] = Field(
        default_factory=list, description="Non-destructive enhancement operations applied for OCR"
    )
    warnings: List[str] = Field(
        default_factory=list, description="Quality, formatting, or matching warnings"
    )
    next_steps: str = Field(..., description="Actionable next step for student or operator")
    disclaimer: str = Field(
        ..., description="Notice that enrollment and authenticity must be verified independently"
    )
    processing_time_ms: float = Field(..., description="Total processing latency in milliseconds")


class HealthResponse(BaseModel):
    """Service health response schema."""
    status: str
    service: str
    version: str
    ocr_engine: str
    environment: str
