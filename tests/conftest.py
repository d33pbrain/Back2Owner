"""Pytest configuration and synthetic test image generators.

Provides fixtures for:
1. Clear student ID card
2. Blurry student ID card
3. Dark / underexposed student ID card
4. Overexposed / glare student ID card
5. Cropped student ID card (edges cut off)
6. Low-resolution student ID card
7. Incorrect document (gym membership card with non-student text)
8. Mismatched name student card
"""

import io
from typing import Tuple
import numpy as np
import cv2
import pytest
from PIL import Image, ImageDraw, ImageFont
from fastapi.testclient import TestClient

from app.api.main import app
from app.ocr.mock_engine import MockOCREngine
from app.api.routes import get_ocr


def generate_synthetic_id_card(
    university: str = "METROPOLITAN UNIVERSITY",
    title: str = "STUDENT IDENTITY CARD",
    name: str = "Alex Morgan",
    department: str = "Computer Science",
    student_id: str = "STU-2024-8831",
    valid_thru: str = "VALID THRU: 2028",
    size: Tuple[int, int] = (800, 500),
    bg_color: Tuple[int, int, int] = (245, 247, 250),
    card_margin: int = 40,
) -> np.ndarray:
    """Generate a high-quality synthetic student ID card using PIL and OpenCV."""
    w, h = size
    # Create RGB image
    pil_img = Image.new("RGB", (w, h), (220, 225, 230))
    draw = ImageDraw.Draw(pil_img)

    # Draw card body with rounded corners
    card_rect = [card_margin, card_margin, w - card_margin, h - card_margin]
    draw.rectangle(card_rect, fill=bg_color, outline=(70, 80, 95), width=3)

    # Header banner
    draw.rectangle(
        [card_margin, card_margin, w - card_margin, card_margin + 70],
        fill=(25, 65, 120),
    )

    # Draw texts using default bitmap font if TTF not specified
    # Title & University
    draw.text((card_margin + 20, card_margin + 15), university, fill=(255, 255, 255))
    draw.text((card_margin + 20, card_margin + 40), title, fill=(200, 220, 255))

    # Photo placeholder
    photo_box = [
        card_margin + 30,
        card_margin + 100,
        card_margin + 180,
        card_margin + 280,
    ]
    draw.rectangle(photo_box, fill=(200, 210, 220), outline=(100, 110, 120), width=2)
    draw.text((photo_box[0] + 15, photo_box[1] + 80), "PHOTO", fill=(100, 110, 120))

    # Field details
    text_x = card_margin + 210
    draw.text((text_x, card_margin + 110), f"STUDENT NAME: {name}", fill=(20, 20, 20))
    draw.text((text_x, card_margin + 150), f"DEPARTMENT: {department}", fill=(20, 20, 20))
    draw.text((text_x, card_margin + 190), f"STUDENT ID: {student_id}", fill=(20, 20, 20))
    draw.text((text_x, card_margin + 230), valid_thru, fill=(70, 70, 70))

    # Barcode representation
    for i in range(30):
        bx = text_x + (i * 8)
        bw = 2 if i % 3 == 0 else 4
        draw.rectangle([bx, card_margin + 290, bx + bw, card_margin + 330], fill=(0, 0, 0))

    # Convert PIL image to OpenCV BGR array
    np_img = np.array(pil_img)
    return cv2.cvtColor(np_img, cv2.COLOR_RGB2BGR)


def generate_gym_membership_card(
    title: str = "METRO FITNESS CLUB",
    name: str = "John Doe",
    member_id: str = "MEMBER #8821",
    size: Tuple[int, int] = (800, 500),
) -> np.ndarray:
    """Generate a non-student card (e.g. gym pass or retail rewards card)."""
    w, h = size
    pil_img = Image.new("RGB", (w, h), (20, 20, 20))
    draw = ImageDraw.Draw(pil_img)

    # Card body
    draw.rectangle([30, 30, w - 30, h - 30], fill=(230, 50, 50), outline=(255, 255, 255), width=3)
    draw.text((60, 60), title, fill=(255, 255, 255))
    draw.text((60, 120), "ALL ACCESS PASS - GYM & SPA", fill=(255, 255, 255))
    draw.text((60, 200), f"CARDHOLDER: {name}", fill=(255, 255, 255))
    draw.text((60, 250), member_id, fill=(255, 255, 255))
    draw.text((60, 320), "FITNESS MEMBERSHIP PASS", fill=(255, 255, 255))

    np_img = np.array(pil_img)
    return cv2.cvtColor(np_img, cv2.COLOR_RGB2BGR)


def image_to_bytes(image: np.ndarray, ext: str = ".jpg") -> bytes:
    """Encode OpenCV BGR image into memory bytes."""
    success, buffer = cv2.imencode(ext, image)
    if not success:
        raise ValueError("Failed to encode image to bytes.")
    return buffer.tobytes()


@pytest.fixture
def clear_student_card_image() -> np.ndarray:
    return generate_synthetic_id_card(
        name="Alex Morgan",
        department="Computer Science",
    )


@pytest.fixture
def clear_student_card_bytes(clear_student_card_image) -> bytes:
    return image_to_bytes(clear_student_card_image, ".jpg")


@pytest.fixture
def blurry_student_card_image(clear_student_card_image) -> np.ndarray:
    # Heavy Gaussian blur to trigger focus failure
    return cv2.GaussianBlur(clear_student_card_image, (35, 35), 15.0)


@pytest.fixture
def blurry_student_card_bytes(blurry_student_card_image) -> bytes:
    return image_to_bytes(blurry_student_card_image, ".jpg")


@pytest.fixture
def dark_student_card_image(clear_student_card_image) -> np.ndarray:
    # Severe underexposure
    return (clear_student_card_image * 0.12).astype(np.uint8)


@pytest.fixture
def dark_student_card_bytes(dark_student_card_image) -> bytes:
    return image_to_bytes(dark_student_card_image, ".jpg")


@pytest.fixture
def cropped_student_card_image(clear_student_card_image) -> np.ndarray:
    # Crop tightly right across text elements and boundary lines
    h, w = clear_student_card_image.shape[:2]
    # Slice off top header and slice middle of text so text edges bleed off the frame
    return clear_student_card_image[60:350, 100:600].copy()


@pytest.fixture
def cropped_student_card_bytes(cropped_student_card_image) -> bytes:
    return image_to_bytes(cropped_student_card_image, ".jpg")


@pytest.fixture
def low_res_student_card_image(clear_student_card_image) -> np.ndarray:
    # Downsample below minimum width 320 and height 200
    return cv2.resize(clear_student_card_image, (180, 120), interpolation=cv2.INTER_AREA)


@pytest.fixture
def low_res_student_card_bytes(low_res_student_card_image) -> bytes:
    return image_to_bytes(low_res_student_card_image, ".jpg")


@pytest.fixture
def gym_card_image() -> np.ndarray:
    return generate_gym_membership_card(name="John Doe")


@pytest.fixture
def gym_card_bytes(gym_card_image) -> bytes:
    return image_to_bytes(gym_card_image, ".jpg")


@pytest.fixture
def mismatched_student_card_image() -> np.ndarray:
    return generate_synthetic_id_card(
        name="Sarah Connor",
        department="Mechanical Engineering",
    )


@pytest.fixture
def mismatched_student_card_bytes(mismatched_student_card_image) -> bytes:
    return image_to_bytes(mismatched_student_card_image, ".jpg")


@pytest.fixture
def test_client():
    return TestClient(app)
