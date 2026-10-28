"""Tests for non-destructive preprocessing pipeline."""

import numpy as np
import cv2
from app.preprocessing.pipeline import ImagePreprocessor


def test_preprocessing_does_not_mutate_original(clear_student_card_image):
    original_copy = clear_student_card_image.copy()
    preprocessor = ImagePreprocessor()

    res = preprocessor.preprocess(clear_student_card_image)

    # Invariant: Original image array must remain 100% identical
    assert np.array_equal(clear_student_card_image, original_copy)
    assert len(res.applied_steps) > 0
    assert res.image is not None
    assert isinstance(res.applied_steps, list)


def test_preprocessing_applies_clahe_and_denoise():
    preprocessor = ImagePreprocessor()
    test_img = np.random.randint(50, 180, (400, 600, 3), dtype=np.uint8)

    res = preprocessor.preprocess(test_img)

    assert "bilateral_denoise" in res.applied_steps
    assert "clahe_contrast_enhancement" in res.applied_steps


def test_preprocessing_upscales_small_image():
    preprocessor = ImagePreprocessor(target_min_width=1000)
    small_img = np.ones((250, 500, 3), dtype=np.uint8) * 128

    res = preprocessor.preprocess(small_img)

    assert "bicubic_upscaling" in res.applied_steps
    assert res.image.shape[1] >= 1000
