"""Non-destructive image preprocessing pipeline for OCR optimization.

Improves OCR readability on low-contrast, skewed, or noisy student documents
while leaving the original uploaded image completely intact.
"""

from dataclasses import dataclass, field
from typing import List, Tuple
import numpy as np
import cv2


@dataclass
class PreprocessedResult:
    """Container holding the enhanced image and applied enhancement steps."""
    image: np.ndarray
    applied_steps: List[str] = field(default_factory=list)
    skew_angle_deg: float = 0.0


class ImagePreprocessor:
    """Preprocesses document images for optimal OCR recognition."""

    def __init__(
        self,
        clahe_clip_limit: float = 2.0,
        clahe_tile_grid_size: Tuple[int, int] = (8, 8),
        target_min_width: int = 1000,
        enable_deskew: bool = True,
    ):
        self.clahe_clip_limit = clahe_clip_limit
        self.clahe_tile_grid_size = clahe_tile_grid_size
        self.target_min_width = target_min_width
        self.enable_deskew = enable_deskew

    def apply_clahe(self, image: np.ndarray) -> np.ndarray:
        """Apply Contrast Limited Adaptive Histogram Equalization on L-channel."""
        clahe = cv2.createCLAHE(
            clipLimit=self.clahe_clip_limit, tileGridSize=self.clahe_tile_grid_size
        )
        if len(image.shape) == 3:
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            l_clahe = clahe.apply(l)
            enhanced_lab = cv2.merge((l_clahe, a, b))
            return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
        else:
            return clahe.apply(image)

    def denoise_edge_preserving(self, image: np.ndarray) -> np.ndarray:
        """Apply edge-preserving bilateral filtering to reduce noise without blurring glyphs."""
        if len(image.shape) == 3:
            return cv2.bilateralFilter(image, d=5, sigmaColor=35, sigmaSpace=35)
        else:
            return cv2.bilateralFilter(image, d=5, sigmaColor=35, sigmaSpace=35)

    def estimate_skew_angle(self, gray: np.ndarray) -> float:
        """Estimate document skew angle using minAreaRect on high-gradient text pixels."""
        # Threshold to get dark text components on light background
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 6
        )
        # Find non-zero points (text pixels)
        pts = cv2.findNonZero(thresh)
        if pts is None or len(pts) < 100:
            return 0.0

        rect = cv2.minAreaRect(pts)
        angle = rect[-1]

        # OpenCV minAreaRect returns angle in [-90, 0)
        if angle < -45:
            angle = 90 + angle
        elif angle > 45:
            angle = angle - 90

        # Only correct modest skew between -25 and 25 degrees
        if abs(angle) > 25.0:
            return 0.0

        return float(angle)

    def rotate_image(self, image: np.ndarray, angle: float) -> np.ndarray:
        """Rotate image by specified angle around center, maintaining bounding box."""
        if abs(angle) < 0.8:
            return image

        h, w = image.shape[:2]
        center = (w // 2, h // 2)
        rot_mat = cv2.getRotationMatrix2D(center, angle, 1.0)
        cos = np.abs(rot_mat[0, 0])
        sin = np.abs(rot_mat[0, 1])

        # New bounding dimensions
        new_w = int((h * sin) + (w * cos))
        new_h = int((h * cos) + (w * sin))

        rot_mat[0, 2] += (new_w / 2) - center[0]
        rot_mat[1, 2] += (new_h / 2) - center[1]

        return cv2.warpAffine(
            image, rot_mat, (new_w, new_h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
        )

    def upscale_if_needed(self, image: np.ndarray) -> Tuple[np.ndarray, bool]:
        """Upscale image if width is small to provide adequate pixel density for OCR."""
        h, w = image.shape[:2]
        if w < self.target_min_width:
            scale = self.target_min_width / float(w)
            # Cap scale factor to avoid excessive memory
            scale = min(scale, 2.5)
            new_w = int(w * scale)
            new_h = int(h * scale)
            upscaled = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
            return upscaled, True
        return image, False

    def preprocess(self, original_image: np.ndarray) -> PreprocessedResult:
        """Execute non-destructive preprocessing pipeline returning enhanced copy.

        The original_image remains pristine and unmodified.
        """
        if original_image is None or original_image.size == 0:
            raise ValueError("Cannot preprocess empty image.")

        # Ensure original is never mutated
        img = original_image.copy()
        steps: List[str] = []

        # 1. Edge-preserving denoising
        img = self.denoise_edge_preserving(img)
        steps.append("bilateral_denoise")

        # 2. Adaptive contrast enhancement
        img = self.apply_clahe(img)
        steps.append("clahe_contrast_enhancement")

        # 3. Deskew if enabled and significant angle found
        skew_angle = 0.0
        if self.enable_deskew:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
            skew_angle = self.estimate_skew_angle(gray)
            if abs(skew_angle) >= 0.8:
                img = self.rotate_image(img, skew_angle)
                steps.append(f"deskew_rotation_{skew_angle:.1f}_deg")

        # 4. Upscale if below target OCR width
        img, upscaled = self.upscale_if_needed(img)
        if upscaled:
            steps.append("bicubic_upscaling")

        return PreprocessedResult(
            image=img,
            applied_steps=steps,
            skew_angle_deg=skew_angle,
        )
