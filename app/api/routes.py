"""API routes for Back2Owner Document Verification."""

import logging
import time
import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.config import settings
from app.security import decode_image_bytes, mask_name, mask_text
from app.quality.assessor import ImageQualityAssessor
from app.preprocessing.pipeline import ImagePreprocessor
from app.ocr import BaseOCREngine, get_ocr_engine
from app.matching.matcher import FieldMatcher
from app.decision.rules import DecisionRulesEngine
from app.api.schemas import (
    ExtractedTextFields,
    HealthResponse,
    ImageQualitySummary,
    MatchConfidence,
    OCRLineBlock,
    VerificationResponse,
)

logger = logging.getLogger("back2owner.verification")
router = APIRouter()

# Singletons for service dependencies
quality_assessor = ImageQualityAssessor()
preprocessor = ImagePreprocessor()
matcher = FieldMatcher()
decision_engine = DecisionRulesEngine()


def get_ocr() -> BaseOCREngine:
    """Dependency provider for OCR Engine."""
    return get_ocr_engine(settings.OCR_ENGINE)


@router.get("/health", response_model=HealthResponse, tags=["Monitoring"])
async def health_check():
    """System health and configuration check."""
    return HealthResponse(
        status="healthy",
        service=settings.SERVICE_NAME,
        version=settings.SERVICE_VERSION,
        ocr_engine=settings.OCR_ENGINE,
        environment=settings.ENVIRONMENT,
    )


@router.post(
    "/api/v1/verify",
    response_model=VerificationResponse,
    status_code=status.HTTP_200_OK,
    tags=["Verification"],
    summary="Verify student document image and compare credentials",
)
async def verify_student_document(
    file: UploadFile = File(..., description="Document image file (JPEG, PNG, WEBP)"),
    first_name: str = Form(..., min_length=1, max_length=100, description="Student's first name"),
    last_name: str = Form(..., min_length=1, max_length=100, description="Student's last name"),
    department: str = Form(..., min_length=1, max_length=150, description="Student's academic department"),
    ocr_engine: BaseOCREngine = Depends(get_ocr),
):
    """Verify an uploaded student ID card image against submitted credentials.

    - Validates image dimensions, file size, and file type
    - Assesses blur, brightness, contrast, and edge cropping
    - Non-destructively pre-processes image for OCR enhancement
    - Runs text extraction via PaddleOCR
    - Matches student name and department using fuzzy matching
    - Returns structured outcome: `checks_passed`, `retake_required`, or `manual_review`
    """
    start_time = time.perf_counter()
    request_id = str(uuid.uuid4())

    # Log incoming request securely with masked PII
    masked_student = mask_name(f"{first_name} {last_name}")
    logger.info(
        f"Verification request received | RequestID: {request_id} | Student: {masked_student} | Dept: {department}"
    )

    # 1. Read file bytes safely with size guard
    try:
        raw_bytes = await file.read()
    except Exception as e:
        logger.error(f"Failed to read uploaded file | RequestID: {request_id} | Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read uploaded file data.",
        )

    if len(raw_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"File size exceeds maximum permitted limit of "
                f"{settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB."
            ),
        )

    # 2. In-memory decoding and format validation
    try:
        original_image, detected_format = decode_image_bytes(raw_bytes)
    except ValueError as ve:
        logger.warning(f"Image validation rejected | RequestID: {request_id} | Reason: {ve}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )

    # Free raw bytes immediately to conserve memory
    del raw_bytes

    try:
        # 3. Assess technical image quality (on original image)
        quality_res = quality_assessor.assess(original_image)

        # 4. Non-destructively preprocess for OCR (original image is never modified)
        preprocessed = preprocessor.preprocess(original_image)

        # 5. Extract readable text using OCR
        ocr_res = ocr_engine.extract_text(preprocessed.image)

        # If preprocessed image yielded no text, attempt fallback on original image
        if len(ocr_res.blocks) == 0 and len(preprocessed.applied_steps) > 0:
            fallback_ocr = ocr_engine.extract_text(original_image)
            if len(fallback_ocr.blocks) > len(ocr_res.blocks):
                ocr_res = fallback_ocr
                preprocessed.applied_steps.append("fallback_to_original_ocr")

        # 6. Extract line texts for fuzzy matching
        extracted_lines = [b.text for b in ocr_res.blocks]

        # 7. Fuzzy match submitted fields
        name_match_res = matcher.match_name(extracted_lines, first_name, last_name)
        dept_match_res = matcher.match_department(extracted_lines, department)

        # 8. Evaluate decision rules
        decision = decision_engine.evaluate(
            quality=quality_res,
            ocr=ocr_res,
            name_match=name_match_res,
            dept_match=dept_match_res,
        )

        processing_ms = (time.perf_counter() - start_time) * 1000.0

        # Log completion securely (no unmasked names or full document content)
        logger.info(
            f"Verification completed | RequestID: {request_id} | "
            f"Outcome: {decision.outcome.value} | "
            f"QualityScore: {quality_res.blur_score:.1f} | "
            f"NameMatch: {name_match_res.score:.1f}% | "
            f"DeptMatch: {dept_match_res.score:.1f}% | "
            f"Duration: {processing_ms:.1f}ms"
        )

        # Build response schema
        return VerificationResponse(
            request_id=request_id,
            outcome=decision.outcome,
            summary_reason=decision.summary_reason,
            quality=ImageQualitySummary(**quality_res.to_dict()),
            extracted_fields=ExtractedTextFields(
                raw_text=ocr_res.full_text,
                line_count=len(ocr_res.blocks),
                average_ocr_confidence=ocr_res.average_confidence,
                student_document_keywords_found=ocr_res.detected_keywords,
                is_student_document_suspected=ocr_res.has_student_card_keywords,
                lines=[
                    OCRLineBlock(
                        text=b.text,
                        confidence=b.confidence,
                        box=b.box,
                    )
                    for b in ocr_res.blocks
                ],
            ),
            match_confidence=MatchConfidence(
                name_score=name_match_res.score,
                name_matched_text=name_match_res.matched_text,
                name_match_method=name_match_res.method,
                name_is_match=name_match_res.is_match,
                department_score=dept_match_res.score,
                department_matched_text=dept_match_res.matched_text,
                department_alias_used=dept_match_res.alias_used,
                department_match_method=dept_match_res.method,
                department_is_match=dept_match_res.is_match,
                overall_confidence=decision.overall_confidence,
            ),
            applied_preprocessing=preprocessed.applied_steps,
            warnings=decision.warnings,
            next_steps=decision.next_steps,
            disclaimer=decision.disclaimer,
            processing_time_ms=round(processing_ms, 2),
        )

    finally:
        # Guarantee memory release of image matrices
        if "original_image" in locals():
            del original_image
        if "preprocessed" in locals():
            del preprocessed
