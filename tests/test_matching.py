"""Tests for fuzzy text normalization and field matching."""

from app.matching.normalizer import normalize_text, remove_accents, tokenize
from app.matching.matcher import FieldMatcher


def test_text_normalization():
    assert normalize_text("  José   MÜLLER-GARCÍA!! ") == "jose muller garcia"
    assert remove_accents("Université de Montréal") == "Universite de Montreal"
    assert tokenize("Computer Science & Engineering") == ["computer", "science", "engineering"]


def test_name_matching_exact():
    matcher = FieldMatcher()
    lines = ["METROPOLITAN UNIVERSITY", "STUDENT NAME: Alex Morgan", "ID: 99401"]

    res = matcher.match_name(lines, "Alex", "Morgan")

    assert res.is_match
    assert res.score >= 90.0
    assert "alex morgan" in res.matched_text.lower()


def test_name_matching_reversed():
    matcher = FieldMatcher()
    lines = ["STUDENT ID CARD", "Morgan, Alex", "Dept: CS"]

    res = matcher.match_name(lines, "Alex", "Morgan")

    assert res.is_match
    assert res.score >= 85.0


def test_name_matching_with_middle_name():
    matcher = FieldMatcher()
    lines = ["UNIVERSITY OF CALIFORNIA", "STUDENT: Alex Jonathan Morgan", "CLASS OF 2026"]

    res = matcher.match_name(lines, "Alex", "Morgan")

    assert res.is_match
    assert res.score >= 80.0
    assert res.method in ("token_set", "token_sort", "partial")


def test_name_matching_with_accents():
    matcher = FieldMatcher()
    lines = ["INSTITUTE OF TECHNOLOGY", "NAME: Jose Garcia", "CAMPUS: MAIN"]

    res = matcher.match_name(lines, "José", "García")

    assert res.is_match
    assert res.score >= 90.0


def test_name_matching_mismatch():
    matcher = FieldMatcher()
    lines = ["METROPOLITAN UNIVERSITY", "STUDENT: Sarah Connor", "DEPT: MECH"]

    res = matcher.match_name(lines, "Alex", "Morgan")

    assert not res.is_match
    assert res.score < 50.0


def test_department_matching_exact():
    matcher = FieldMatcher()
    lines = ["STUDENT NAME: Alex Morgan", "DEPARTMENT: Computer Science", "YEAR: 2024"]

    res = matcher.match_department(lines, "Computer Science")

    assert res.is_match
    assert res.score >= 90.0


def test_department_matching_alias_expansion():
    matcher = FieldMatcher()
    # Student card has "Dept of CS", user submitted "Computer Science"
    lines = ["ALEX MORGAN", "DEPT OF CS", "MATRICULATION: 2024"]

    res = matcher.match_department(lines, "Computer Science")

    assert res.is_match
    assert res.score >= 80.0

    # Conversely: card has "Computer Science", user submitted "CS"
    lines2 = ["ALEX MORGAN", "SCHOOL OF COMPUTER SCIENCE", "MATRICULATION: 2024"]
    res2 = matcher.match_department(lines2, "CS")
    assert res2.is_match
    assert res2.score >= 80.0


def test_department_matching_mismatch():
    matcher = FieldMatcher()
    lines = ["ALEX MORGAN", "DEPARTMENT: History and Philosophy", "ENROLLMENT: ACTIVE"]

    res = matcher.match_department(lines, "Computer Science")

    assert not res.is_match
    assert res.score < 50.0
