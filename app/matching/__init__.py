"""Field matching package for Back2Owner."""

from app.matching.normalizer import normalize_text, tokenize, remove_accents
from app.matching.matcher import FieldMatcher, NameMatchResult, DeptMatchResult, DEPARTMENT_ALIASES

__all__ = [
    "normalize_text",
    "tokenize",
    "remove_accents",
    "FieldMatcher",
    "NameMatchResult",
    "DeptMatchResult",
    "DEPARTMENT_ALIASES",
]
