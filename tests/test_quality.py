"""Tests for image quality assessment module."""

import numpy as np
import pytest
from app.quality.assessor import ImageQualityAssessor


def test_quality_assessor_clear_image(clear_student_card_image):
    assessor = ImageQualityAssessor()
    res = assessor.assess(clear_student_card_image)

    assert res.blur_score > assessor.blur_threshold
    assert not res.is_blurry
    assert not res.is_dark
    assert not res.is_overexposed
    assert not res.is_low_resolution
    assert res.is_acceptable_quality
    assert len(res.quality_warnings) == 0


def test_quality_assessor_blurry_image(blurry_student_card_image):
    assessor = ImageQualityAssessor()
    res = assessor.assess(blurry_student_card_image)

    assert res.is_blurry
    assert res.blur_score < assessor.blur_threshold
    assert not res.is_acceptable_quality
    assert any("blurry" in w.lower() for w in res.quality_warnings)


def test_quality_assessor_dark_image(dark_student_card_image):
    assessor = ImageQualityAssessor()
    res = assessor.assess(dark_student_card_image)

    assert res.is_dark
    assert res.brightness_score < assessor.min_brightness
    assert not res.is_acceptable_quality
    assert any("dark" in w.lower() for w in res.quality_warnings)


def test_quality_assessor_low_resolution(low_res_student_card_image):
    assessor = ImageQualityAssessor()
    res = assessor.assess(low_res_student_card_image)

    assert res.is_low_resolution
    assert res.width < assessor.min_width or res.height < assessor.min_height
    assert not res.is_acceptable_quality
    assert any("resolution" in w.lower() for w in res.quality_warnings)


def test_quality_assessor_cropped_image(cropped_student_card_image):
    assessor = ImageQualityAssessor()
    res = assessor.assess(cropped_student_card_image)

    # Edge density along border is elevated due to cut-off text/borders
    assert res.crop_edge_density > 0.05
    assert res.to_dict()["crop_edge_density"] is not None


def test_quality_assessor_rejects_empty():
    assessor = ImageQualityAssessor()
    with pytest.raises(ValueError):
        assessor.assess(np.array([]))
