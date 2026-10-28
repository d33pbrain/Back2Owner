"""End-to-end API tests covering all required verification scenarios and security guards."""

import io
import pytest
from fastapi.testclient import TestClient

from app.api.main import app
from app.ocr.mock_engine import MockOCREngine
from app.api.routes import get_ocr
from app.security import mask_name, PIIRedactionFilter
import logging


@pytest.fixture
def override_mock_ocr():
    """Provides a configurable mock OCR engine dependency for isolated API tests."""
    engine = MockOCREngine([
        ("METROPOLITAN UNIVERSITY", 0.98),
        ("STUDENT IDENTITY CARD", 0.99),
        ("STUDENT NAME: Alex Morgan", 0.96),
        ("DEPARTMENT: Computer Science", 0.95),
        ("STUDENT ID: STU-2024-8831", 0.92),
        ("VALID THRU: 2028", 0.94),
    ])
    app.dependency_overrides[get_ocr] = lambda: engine
    yield engine
    app.dependency_overrides.clear()


def test_health_check(test_client):
    response = test_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Back2Owner" in data["service"]


def test_api_clear_student_card_checks_passed(test_client, clear_student_card_bytes, override_mock_ocr):
    """Case 1: Clear, legible student ID card with matching credentials."""
    response = test_client.post(
        "/api/v1/verify",
        files={"file": ("student_card.jpg", clear_student_card_bytes, "image/jpeg")},
        data={
            "first_name": "Alex",
            "last_name": "Morgan",
            "department": "Computer Science",
        },
    )

    assert response.status_code == 200
    res = response.json()
    assert res["outcome"] == "checks_passed"
    assert res["quality"]["is_acceptable_quality"] is True
    assert res["match_confidence"]["name_is_match"] is True
    assert res["match_confidence"]["department_is_match"] is True
    assert "authoritative university database" in res["disclaimer"]


def test_api_blurry_card_retake_required(test_client, blurry_student_card_bytes, override_mock_ocr):
    """Case 2: Blurry document image triggers retake_required."""
    response = test_client.post(
        "/api/v1/verify",
        files={"file": ("blurry_card.jpg", blurry_student_card_bytes, "image/jpeg")},
        data={
            "first_name": "Alex",
            "last_name": "Morgan",
            "department": "Computer Science",
        },
    )

    assert response.status_code == 200
    res = response.json()
    assert res["outcome"] == "retake_required"
    assert res["quality"]["is_blurry"] is True
    assert any("blurry" in w.lower() for w in res["warnings"])
    assert "retake" in res["next_steps"].lower()


def test_api_dark_card_retake_required(test_client, dark_student_card_bytes, override_mock_ocr):
    """Case 3: Dark / underexposed document triggers retake_required."""
    response = test_client.post(
        "/api/v1/verify",
        files={"file": ("dark_card.jpg", dark_student_card_bytes, "image/jpeg")},
        data={
            "first_name": "Alex",
            "last_name": "Morgan",
            "department": "Computer Science",
        },
    )

    assert response.status_code == 200
    res = response.json()
    assert res["outcome"] == "retake_required"
    assert res["quality"]["is_dark"] is True
    assert any("dark" in w.lower() for w in res["warnings"])


def test_api_low_resolution_retake_required(test_client, low_res_student_card_bytes, override_mock_ocr):
    """Case 4: Low-resolution image triggers retake_required."""
    response = test_client.post(
        "/api/v1/verify",
        files={"file": ("low_res.jpg", low_res_student_card_bytes, "image/jpeg")},
        data={
            "first_name": "Alex",
            "last_name": "Morgan",
            "department": "Computer Science",
        },
    )

    assert response.status_code == 200
    res = response.json()
    assert res["outcome"] == "retake_required"
    assert res["quality"]["is_low_resolution"] is True


def test_api_cropped_card(test_client, cropped_student_card_bytes, override_mock_ocr):
    """Case 5: Heavily cropped image triggers warnings."""
    response = test_client.post(
        "/api/v1/verify",
        files={"file": ("cropped.jpg", cropped_student_card_bytes, "image/jpeg")},
        data={
            "first_name": "Alex",
            "last_name": "Morgan",
            "department": "Computer Science",
        },
    )

    assert response.status_code == 200
    res = response.json()
    assert res["quality"]["crop_edge_density"] is not None


def test_api_incorrect_document_manual_review(test_client, gym_card_bytes, override_mock_ocr):
    """Case 6: Unrelated document (gym membership card) triggers manual_review without fraud claim."""
    # Configure mock OCR to return gym card lines without student keywords
    override_mock_ocr.set_predefined_lines([
        ("METRO FITNESS CLUB", 0.99),
        ("ALL ACCESS PASS - GYM & SPA", 0.96),
        ("CARDHOLDER: John Doe", 0.95),
        ("MEMBER #8821", 0.91),
        ("VALID THRU: 12/2026", 0.94),
    ])

    response = test_client.post(
        "/api/v1/verify",
        files={"file": ("gym_card.jpg", gym_card_bytes, "image/jpeg")},
        data={
            "first_name": "Alex",
            "last_name": "Morgan",
            "department": "Computer Science",
        },
    )

    assert response.status_code == 200
    res = response.json()
    assert res["outcome"] == "manual_review"
    assert res["extracted_fields"]["is_student_document_suspected"] is False
    # Safe language: Never accuse of fraud
    assert "fraud" not in res["summary_reason"].lower()
    assert "counterfeit" not in res["summary_reason"].lower()
    assert "fake" not in res["summary_reason"].lower()


def test_api_mismatched_name_manual_review(test_client, mismatched_student_card_bytes, override_mock_ocr):
    """Case 7: Student card for another person (Sarah Connor) triggers manual_review."""
    override_mock_ocr.set_predefined_lines([
        ("METROPOLITAN UNIVERSITY", 0.98),
        ("STUDENT IDENTITY CARD", 0.99),
        ("STUDENT NAME: Sarah Connor", 0.96),
        ("DEPARTMENT: Mechanical Engineering", 0.95),
    ])

    response = test_client.post(
        "/api/v1/verify",
        files={"file": ("mismatched.jpg", mismatched_student_card_bytes, "image/jpeg")},
        data={
            "first_name": "Alex",
            "last_name": "Morgan",
            "department": "Computer Science",
        },
    )

    assert response.status_code == 200
    res = response.json()
    assert res["outcome"] == "manual_review"
    assert res["match_confidence"]["name_is_match"] is False
    assert "fraud" not in res["summary_reason"].lower()


def test_api_department_alias_matching(test_client, clear_student_card_bytes, override_mock_ocr):
    """Case 8: Department alias 'CS' matches 'Computer Science' on card."""
    override_mock_ocr.set_predefined_lines([
        ("METROPOLITAN UNIVERSITY", 0.98),
        ("STUDENT IDENTITY CARD", 0.99),
        ("STUDENT NAME: Alex Morgan", 0.96),
        ("DEPARTMENT: Dept of CS", 0.95),
    ])

    response = test_client.post(
        "/api/v1/verify",
        files={"file": ("card.jpg", clear_student_card_bytes, "image/jpeg")},
        data={
            "first_name": "Alex",
            "last_name": "Morgan",
            "department": "Computer Science",
        },
    )

    assert response.status_code == 200
    res = response.json()
    assert res["outcome"] == "checks_passed"
    assert res["match_confidence"]["department_is_match"] is True


def test_api_invalid_file_format_rejected(test_client):
    """Case 9: Non-image or corrupted text file rejected with 400 Bad Request."""
    fake_txt_bytes = b"This is a text file masquerading as an image." * 60
    response = test_client.post(
        "/api/v1/verify",
        files={"file": ("fake.jpg", fake_txt_bytes, "image/jpeg")},
        data={
            "first_name": "Alex",
            "last_name": "Morgan",
            "department": "Computer Science",
        },
    )

    assert response.status_code == 400
    assert "Unsupported or unrecognized image format" in response.json()["detail"]


def test_api_missing_fields_validation_error(test_client, clear_student_card_bytes):
    """Case 10: Missing mandatory form fields returns 422 Unprocessable Entity."""
    response = test_client.post(
        "/api/v1/verify",
        files={"file": ("card.jpg", clear_student_card_bytes, "image/jpeg")},
        data={
            "first_name": "Alex",
            # missing last_name and department
        },
    )

    assert response.status_code == 422
    assert "Validation Error" in response.json()["error"]


def test_api_oversized_file_rejected(test_client):
    """Case 11: File exceeding maximum upload size returns 413."""
    # 11 MB of zero bytes
    large_bytes = b"\xff\xd8\xff" + (b"\x00" * (11 * 1024 * 1024))
    response = test_client.post(
        "/api/v1/verify",
        files={"file": ("large.jpg", large_bytes, "image/jpeg")},
        data={
            "first_name": "Alex",
            "last_name": "Morgan",
            "department": "Computer Science",
        },
    )

    assert response.status_code == 413


def test_pii_protection_helpers():
    """Case 12: Verify PII masking and redaction functions."""
    assert mask_name("Alex Morgan") == "A*** M***"
    assert mask_name("John Fitzgerald Kennedy") == "J*** F*** K***"

    # Test logger filter
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="",
        lineno=0,
        msg="Student STU2024991 registered with email alex@university.edu",
        args=(),
        exc_info=None,
    )
    pii_filter = PIIRedactionFilter()
    pii_filter.filter(record)

    assert "alex@university.edu" not in record.msg
    assert "[REDACTED_EMAIL]" in record.msg
    assert "STU2024991" not in record.msg
    assert "[REDACTED_ID]" in record.msg
