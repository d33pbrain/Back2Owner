"""Fuzzy matching engine for student name and department verification.

Uses RapidFuzz algorithms (token_sort_ratio, token_set_ratio, partial_ratio)
combined with department alias dictionaries and name permutation strategies.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from rapidfuzz import fuzz

from app.config import settings
from app.matching.normalizer import normalize_text, tokenize


# Canonical department dictionary with acronyms and common variations
DEPARTMENT_ALIASES: Dict[str, Set[str]] = {
    "computer science": {
        "cs",
        "cse",
        "comp sci",
        "computing",
        "computer science & engineering",
        "computer engineering",
        "school of computing",
        "dept of cs",
        "dept of computer science",
        "information technology",
        "it",
        "software engineering",
    },
    "electrical engineering": {
        "ee",
        "ece",
        "electrical and electronics engineering",
        "electrical & electronic engineering",
        "dept of ee",
        "electrical eng",
    },
    "mechanical engineering": {
        "me",
        "mech eng",
        "dept of me",
        "dept of mechanical engineering",
        "mechanical & aerospace engineering",
    },
    "civil engineering": {
        "ce",
        "civil eng",
        "civil and environmental engineering",
        "dept of ce",
    },
    "business administration": {
        "business",
        "bba",
        "mba",
        "school of business",
        "management",
        "business school",
        "finance",
        "accounting",
        "marketing",
        "commerce",
    },
    "biological sciences": {
        "biology",
        "bio",
        "biomed",
        "biomedical sciences",
        "biomedical engineering",
        "bme",
        "biochemistry",
        "dept of biology",
    },
    "physics": {
        "physical sciences",
        "dept of physics",
        "applied physics",
    },
    "chemistry": {
        "chem",
        "chemical engineering",
        "che",
        "dept of chemistry",
    },
    "mathematics": {
        "math",
        "maths",
        "applied mathematics",
        "statistics",
        "stats",
        "dept of math",
        "dept of mathematics",
    },
    "economics": {
        "econ",
        "dept of economics",
        "school of economics",
    },
    "medicine": {
        "medical",
        "med",
        "school of medicine",
        "pre med",
        "mbbs",
        "health sciences",
    },
    "law": {
        "legal studies",
        "faculty of law",
        "school of law",
        "llb",
        "jd",
    },
}


@dataclass
class NameMatchResult:
    """Detailed result of student name matching."""
    score: float
    matched_text: str = ""
    target_name: str = ""
    method: str = "none"
    is_match: bool = False
    is_borderline: bool = False

    def to_dict(self) -> dict:
        return {
            "score": round(self.score, 2),
            "matched_text": self.matched_text,
            "target_name": self.target_name,
            "method": self.method,
            "is_match": self.is_match,
            "is_borderline": self.is_borderline,
        }


@dataclass
class DeptMatchResult:
    """Detailed result of department matching."""
    score: float
    matched_text: str = ""
    target_dept: str = ""
    alias_used: Optional[str] = None
    method: str = "none"
    is_match: bool = False
    is_borderline: bool = False

    def to_dict(self) -> dict:
        return {
            "score": round(self.score, 2),
            "matched_text": self.matched_text,
            "target_dept": self.target_dept,
            "alias_used": self.alias_used,
            "method": self.method,
            "is_match": self.is_match,
            "is_borderline": self.is_borderline,
        }


class FieldMatcher:
    """Matches submitted student information against extracted OCR lines."""

    def __init__(
        self,
        name_threshold: float = settings.NAME_MATCH_THRESHOLD,
        name_borderline: float = settings.NAME_BORDERLINE_THRESHOLD,
        dept_threshold: float = settings.DEPT_MATCH_THRESHOLD,
        dept_borderline: float = settings.DEPT_BORDERLINE_THRESHOLD,
    ):
        self.name_threshold = name_threshold
        self.name_borderline = name_borderline
        self.dept_threshold = dept_threshold
        self.dept_borderline = dept_borderline

    def match_name(
        self, extracted_lines: List[str], first_name: str, last_name: str
    ) -> NameMatchResult:
        """Compare submitted first and last name against extracted OCR lines."""
        norm_first = normalize_text(first_name)
        norm_last = normalize_text(last_name)

        if not norm_first or not norm_last:
            return NameMatchResult(score=0.0, target_name=f"{first_name} {last_name}")

        name_variants = [
            f"{norm_first} {norm_last}",
            f"{norm_last} {norm_first}",
            f"{norm_last}, {norm_first}",
        ]
        target_name_display = f"{first_name.strip()} {last_name.strip()}"

        best_score = 0.0
        best_line = ""
        best_method = "none"

        # Also consider sliding windows of 2 consecutive lines (in case name is wrapped)
        candidate_lines = [normalize_text(l) for l in extracted_lines if normalize_text(l)]
        window_lines = candidate_lines.copy()
        for i in range(len(candidate_lines) - 1):
            window_lines.append(f"{candidate_lines[i]} {candidate_lines[i+1]}")

        for line in window_lines:
            line_tokens = set(tokenize(line))

            for variant in name_variants:
                # 1. Token set ratio (handles middle names or extraneous prefix/suffix words)
                score_token_set = fuzz.token_set_ratio(variant, line)
                # 2. Token sort ratio (handles rearranged order)
                score_token_sort = fuzz.token_sort_ratio(variant, line)
                # 3. Partial ratio (handles substring embedding)
                score_partial = fuzz.partial_ratio(variant, line)

                current_max = max(score_token_set, score_token_sort, score_partial)
                if current_max > best_score:
                    best_score = current_max
                    best_line = line
                    if current_max == score_token_set:
                        best_method = "token_set"
                    elif current_max == score_token_sort:
                        best_method = "token_sort"
                    else:
                        best_method = "partial"

            # Check initials heuristic: e.g. "A. Morgan" or "Morgan A."
            if norm_first and norm_last:
                first_initial = norm_first[0]
                if (
                    norm_last in line_tokens
                    and (first_initial in line_tokens or f"{first_initial}." in line)
                ):
                    initial_score = 85.0
                    if initial_score > best_score:
                        best_score = initial_score
                        best_line = line
                        best_method = "initials_match"

        is_match = best_score >= self.name_threshold
        is_borderline = (self.name_borderline <= best_score < self.name_threshold)

        return NameMatchResult(
            score=best_score,
            matched_text=best_line,
            target_name=target_name_display,
            method=best_method,
            is_match=is_match,
            is_borderline=is_borderline,
        )

    def _get_expanded_department_targets(self, submitted_dept: str) -> List[tuple[str, Optional[str]]]:
        """Expand submitted department into canonical and alias variations."""
        norm_dept = normalize_text(submitted_dept)
        targets = [(norm_dept, None)]

        # Check if submitted matches a canonical name or an alias
        for canonical, aliases in DEPARTMENT_ALIASES.items():
            norm_canonical = normalize_text(canonical)
            norm_aliases = {normalize_text(a) for a in aliases}

            if norm_dept == norm_canonical or norm_dept in norm_aliases:
                # Add canonical
                if norm_canonical != norm_dept:
                    targets.append((norm_canonical, canonical))
                # Add all other aliases
                for a in norm_aliases:
                    if a != norm_dept:
                        targets.append((a, a))
                break

        return targets

    def match_department(
        self, extracted_lines: List[str], department: str
    ) -> DeptMatchResult:
        """Compare submitted department against extracted OCR lines."""
        norm_dept = normalize_text(department)
        if not norm_dept:
            return DeptMatchResult(score=0.0, target_dept=department)

        targets = self._get_expanded_department_targets(department)
        candidate_lines = [normalize_text(l) for l in extracted_lines if normalize_text(l)]

        best_score = 0.0
        best_line = ""
        best_alias: Optional[str] = None
        best_method = "none"

        for line in candidate_lines:
            line_tokens = set(tokenize(line))

            for target_variant, alias_source in targets:
                target_tokens = set(tokenize(target_variant))
                if not target_tokens:
                    continue

                # Short acronyms (e.g. "cs", "ee", "me", "it") must match whole tokens
                if len(target_variant.strip()) <= 4:
                    if target_variant.strip() in line_tokens:
                        score = 100.0
                        method = "acronym_exact_token"
                    else:
                        score = 0.0
                        method = "acronym_no_match"
                elif target_tokens.issubset(line_tokens):
                    score = 100.0
                    method = "token_subset_exact"
                else:
                    # Strip common boilerplate words like "dept", "department", "of" when comparing
                    clean_target_tokens = [t for t in target_tokens if t not in ("dept", "department", "of", "school")]
                    clean_line_tokens = [t for t in line_tokens if t not in ("dept", "department", "of", "school")]

                    clean_target = " ".join(clean_target_tokens)
                    clean_line = " ".join(clean_line_tokens)

                    if not clean_target or not clean_line:
                        score = 0.0
                        method = "empty_after_stopwords"
                    else:
                        s_token_set = fuzz.token_set_ratio(clean_target, clean_line)
                        s_token_sort = fuzz.token_sort_ratio(clean_target, clean_line)
                        score = max(s_token_set, s_token_sort)
                        method = "token_set" if score == s_token_set else "token_sort"

                if score > best_score:
                    best_score = score
                    best_line = line
                    best_alias = alias_source
                    best_method = method

        is_match = best_score >= self.dept_threshold
        is_borderline = (self.dept_borderline <= best_score < self.dept_threshold)

        return DeptMatchResult(
            score=best_score,
            matched_text=best_line,
            target_dept=department.strip(),
            alias_used=best_alias,
            method=best_method,
            is_match=is_match,
            is_borderline=is_borderline,
        )
