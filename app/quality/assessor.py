"""Image quality assessment module for Back2Owner.

Evaluates uploaded student document images across:
- Blur (Laplacian variance)
- Brightness and contrast (luminance distribution)
- Resolution (pixel dimensions and megapixels)
- Cropping and boundary cutoff (edge density along image boundaries)
"""

from dataclasses import dataclass, field
from typing import List
import numpy as np
import cv2

from app.config import settings


@dataclass
class QualityAssessmentResult:
    """Structured result of image quality inspection."""
    blur_score: float
    is_blurry: bool
    brightness_score: float
    is_dark: bool
    is_overexposed: bool
    contrast_score: float
    is_low_contrast: bool
    width: int
    height: int
    megapixels: float
    is_low_resolution: bool
    is_cropped: bool
    crop_edge_density: float
    quality_warnings: List[str] = field(default_factory=list)
    is_acceptable_quality: bool = True

    def to_dict(self) -> dict:
        return {
            "blur_score": round(self.blur_score, 2),
            "is_blurry": self.is_blurry,
            "brightness_score": round(self.brightness_score, 2),
            "is_dark": self.is_dark,
            "is_overexposed": self.is_overexposed,
            "contrast_score": round(self.contrast_score, 2),
            "is_low_contrast": self.is_low_contrast,
            "width": self.width,
            "height": self.height,
            "megapixels": round(self.megapixels, 3),
            "is_low_resolution": self.is_low_resolution,
            "is_cropped": self.is_cropped,
            "crop_edge_density": round(self.crop_edge_density, 4),
            "quality_warnings": self.quality_warnings,
            "is_acceptable_quality": self.is_acceptable_quality,
        }


class ImageQualityAssessor:
    """Assesses technical quality of student document images."""

    def __init__(
        self,
        blur_threshold: float = settings.BLUR_THRESHOLD,
        min_brightness: float = settings.MIN_BRIGHTNESS,
        max_brightness: float = settings.MAX_BRIGHTNESS,
        min_contrast: float = settings.MIN_CONTRAST,
        min_width: int = settings.MIN_IMAGE_WIDTH,
        min_height: int = settings.MIN_IMAGE_HEIGHT,
        crop_border_ratio: float = settings.CROP_BORDER_MARGIN_RATIO,
        crop_edge_density_threshold: float = settings.CROP_EDGE_DENSITY_THRESHOLD,
    ):
        self.blur_threshold = blur_threshold
        self.min_brightness = min_brightness
        self.max_brightness = max_brightness
        self.min_contrast = min_contrast
        self.min_width = min_width
        self.min_height = min_height
        self.crop_border_ratio = crop_border_ratio
        self.crop_edge_density_threshold = crop_edge_density_threshold

    def compute_blur(self, gray: np.ndarray) -> float:
        """Calculate focus sharpness using the variance of the Laplacian operator."""
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        return float(laplacian.var())

    def compute_brightness_and_contrast(self, gray: np.ndarray) -> tuple[float, float]:
        """Calculate mean luminance and standard deviation (contrast)."""
        mean_brightness = float(np.mean(gray))
        contrast = float(np.std(gray))
        return mean_brightness, contrast

    def compute_crop_edge_density(self, gray: np.ndarray) -> float:
        """Detect edge cutoff along outer boundaries to identify cropped documents.

        When document text or card boundaries are cropped off at the frame edge,
        a disproportionate number of high-gradient Canny edges intersect the outer 2% margin.
        """
        h, w = gray.shape
        margin_y = max(2, int(h * self.crop_border_ratio))
        margin_x = max(2, int(w * self.crop_border_ratio))

        edges = cv2.Canny(gray, 100, 200)

        # Create a mask for the outer boundary strip (top, bottom, left, right)
        border_mask = np.zeros_like(edges, dtype=np.uint8)
        border_mask[:margin_y, :] = 255
        border_mask[-margin_y:, :] = 255
        border_mask[:, :margin_x] = 255
        border_mask[:, -margin_x:] = 255

        border_pixels = np.count_nonzero(border_mask)
        if border_pixels == 0:
            return 0.0

        border_edge_pixels = np.count_nonzero(edges & border_mask)
        edge_density = float(border_edge_pixels / border_pixels)
        return edge_density

    def assess(self, image: np.ndarray) -> QualityAssessmentResult:
        """Run complete quality assessment on image."""
        if image is None or image.size == 0:
            raise ValueError("Cannot assess empty or null image.")

        h, w = image.shape[:2]
        megapixels = (h * w) / 1_000_000.0

        # Convert to grayscale for metric calculations
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        blur_score = self.compute_blur(gray)
        brightness_score, contrast_score = self.compute_brightness_and_contrast(gray)
        crop_edge_density = self.compute_crop_edge_density(gray)

        # Evaluate against thresholds
        is_blurry = blur_score < self.blur_threshold
        is_dark = brightness_score < self.min_brightness
        is_overexposed = brightness_score > self.max_brightness
        is_low_contrast = contrast_score < self.min_contrast
        is_low_resolution = (w < self.min_width) or (h < self.min_height)
        is_cropped = crop_edge_density > self.crop_edge_density_threshold

        warnings = []
        if is_blurry:
            warnings.append(
                f"Image is blurry (focus score: {blur_score:.1f} < threshold {self.blur_threshold:.1f})."
            )
        if is_dark:
            warnings.append(
                f"Image is too dark (brightness: {brightness_score:.1f} < threshold {self.min_brightness:.1f})."
            )
        if is_overexposed:
            warnings.append(
                f"Image is overexposed or has excessive glare (brightness: {brightness_score:.1f} > threshold {self.max_brightness:.1f})."
            )
        if is_low_contrast:
            warnings.append(
                f"Image has low contrast (score: {contrast_score:.1f} < threshold {self.min_contrast:.1f})."
            )
        if is_low_resolution:
            warnings.append(
                f"Image resolution {w}x{h} is below minimum requirement ({self.min_width}x{self.min_height})."
            )
        if is_cropped:
            warnings.append(
                f"Document appears cropped or cut off at edges (edge density: {crop_edge_density:.3f} > threshold {self.crop_edge_density_threshold:.3f})."
            )

        # Flag acceptable quality (if fatal quality defects exist, retake will be required)
        is_acceptable = not (is_blurry or is_dark or is_overexposed or is_low_resolution or is_cropped)

        return QualityAssessmentResult(
            blur_score=blur_score,
            is_blurry=is_blurry,
            brightness_score=brightness_score,
            is_dark=is_dark,
            is_overexposed=is_overexposed,
            contrast_score=contrast_score,
            is_low_contrast=is_low_contrast,
            width=w,
            height=h,
            megapixels=megapixels,
            is_low_resolution=is_low_resolution,
            is_cropped=is_cropped,
            crop_edge_density=crop_edge_density,
            quality_warnings=warnings,
            is_acceptable_quality=is_acceptable,
        )
