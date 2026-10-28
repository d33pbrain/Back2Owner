"""Text normalization utilities for document field matching."""

import re
import unicodedata
from typing import List


def remove_accents(text: str) -> str:
    """Normalize unicode and strip diacritical marks (e.g., 'José' -> 'Jose')."""
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def normalize_text(text: str) -> str:
    """Clean and standardize text for reliable fuzzy comparison.

    - Strips accents and diacritics
    - Lowercases
    - Replaces punctuation and special characters with spaces
    - Collapses multiple whitespace characters
    """
    if not text:
        return ""

    text = remove_accents(text).lower()
    # Replace non-alphanumeric characters with spaces (preserve numbers & letters)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


def tokenize(text: str) -> List[str]:
    """Tokenize normalized text into unique words."""
    norm = normalize_text(text)
    return [w for w in norm.split() if w]
