"""
Reality bRand Check AI - Fast Deterministic Rule Checker for AI Engine

Performs high-precision, low-latency deterministic checks for:
1. Prohibited terminology usage (whitespace-tolerant regex)
2. Approved terminology consistency and casing
3. Brand name casing and consistency
4. Approved product name casing and consistency
"""

import re
from typing import List, Optional

from .schemas import (
    BrandGuidelines,
    Finding,
    FindingCategory,
    FindingStatus,
    Severity,
)


def _build_word_pattern(term: str) -> re.Pattern:
    """
    Build a whitespace-tolerant regex pattern with word boundaries.
    Multi-word phrases match across multiple spaces, tabs, or newlines.
    Handles alphanumeric boundaries or punctuation-aware lookaround boundaries.
    """
    term_clean = term.strip()
    if not term_clean:
        return re.compile(r"(?!)")  # Never matches empty string

    # Split into words to allow arbitrary whitespace/newlines between tokens
    words = term_clean.split()
    escaped_words = [re.escape(w) for w in words]
    pattern_body = r"\s+".join(escaped_words)

    # Apply word boundaries if start/end tokens are alphanumeric,
    # or lookarounds if they begin/end with punctuation (e.g. .NET, Yahoo!, C++)
    prefix = r"\b" if re.match(r"^\w", words[0]) else r"(?<!\w)"
    suffix = r"\b" if re.search(r"\w$", words[-1]) else r"(?!\w)"
    return re.compile(rf"{prefix}{pattern_body}{suffix}", re.IGNORECASE)


def check_prohibited_terms(
    content: str,
    brand_guidelines: BrandGuidelines,
) -> List[Finding]:
    """
    Detect prohibited terms in the submitted content using whitespace-tolerant matching.
    Returns HIGH severity VIOLATION findings with 1.0 confidence.
    """
    findings: List[Finding] = []
    if not brand_guidelines.prohibited_terms:
        return findings

    idx = 1
    for term in brand_guidelines.prohibited_terms:
        if not term or not term.strip():
            continue
        pattern = _build_word_pattern(term)
        for match in pattern.finditer(content):
            matched_text = match.group(0)
            suggestion = None
            if brand_guidelines.approved_terms:
                suggestion = f"Consider replacing '{matched_text}' with an approved alternative or removing it."
            else:
                suggestion = f"Remove or replace prohibited term '{matched_text}'."

            finding = Finding(
                finding_id=f"DET-TERM-{idx}",
                category=FindingCategory.TERMINOLOGY,
                severity=Severity.HIGH,
                status=FindingStatus.VIOLATION,
                original_text=matched_text,
                explanation=f"The prohibited term '{term}' was used in the content, violating brand guidelines.",
                violated_guideline=f"Prohibited term: {term}",
                evidence=None,
                suggestion=suggestion,
                confidence=1.0,
            )
            findings.append(finding)
            idx += 1

    return findings


def check_approved_terms_consistency(
    content: str,
    brand_guidelines: BrandGuidelines,
) -> List[Finding]:
    """
    Detect casing inconsistencies for approved terms where specific canonical casing is specified.
    Enforces canonical casing only when the approved term explicitly contains uppercase characters (e.g., EcoFriendly, ISO-9001, iPhone).
    Does NOT flag normal sentence capitalization for lowercase canonical terms (e.g., affordable).
    """
    findings: List[Finding] = []
    if not brand_guidelines.approved_terms:
        return findings

    idx = 1
    for term in brand_guidelines.approved_terms:
        if not term or not term.strip():
            continue
        canonical_term = term.strip()
        # Enforce canonical casing only when the approved term explicitly contains uppercase characters
        if not any(c.isupper() for c in canonical_term):
            continue

        pattern = _build_word_pattern(canonical_term)
        for match in pattern.finditer(content):
            matched_text = match.group(0)
            if matched_text != canonical_term:
                finding = Finding(
                    finding_id=f"DET-APP-TERM-{idx}",
                    category=FindingCategory.TERMINOLOGY,
                    severity=Severity.LOW,
                    status=FindingStatus.VIOLATION,
                    original_text=matched_text,
                    explanation=(
                        f"Approved term '{matched_text}' does not match the canonical "
                        f"casing '{canonical_term}'."
                    ),
                    violated_guideline=f"Approved term casing: {canonical_term}",
                    evidence=None,
                    suggestion=canonical_term,
                    confidence=1.0,
                )
                findings.append(finding)
                idx += 1

    return findings


def check_brand_name_consistency(
    content: str,
    brand_guidelines: BrandGuidelines,
) -> List[Finding]:
    """
    Detect casing and formatting inconsistencies for the brand name.
    """
    findings: List[Finding] = []
    brand_name = (brand_guidelines.brand_name or "").strip()
    if not brand_name:
        return findings

    pattern = _build_word_pattern(brand_name)
    idx = 1
    for match in pattern.finditer(content):
        matched_text = match.group(0)
        # Check if casing or formatting differs from the canonical brand name
        if matched_text != brand_name:
            finding = Finding(
                finding_id=f"DET-BRAND-{idx}",
                category=FindingCategory.BRAND_CONSISTENCY,
                severity=Severity.MEDIUM,
                status=FindingStatus.VIOLATION,
                original_text=matched_text,
                explanation=(
                    f"Brand name '{matched_text}' does not match the canonical "
                    f"brand casing '{brand_name}'."
                ),
                violated_guideline=f"Brand name casing: {brand_name}",
                evidence=None,
                suggestion=brand_name,
                confidence=1.0,
            )
            findings.append(finding)
            idx += 1

    return findings


def check_product_names_consistency(
    content: str,
    brand_guidelines: BrandGuidelines,
) -> List[Finding]:
    """
    Detect casing and formatting inconsistencies for approved product names.
    """
    findings: List[Finding] = []
    if not brand_guidelines.approved_product_names:
        return findings

    idx = 1
    for product in brand_guidelines.approved_product_names:
        if not product or not product.strip():
            continue
        canonical_product = product.strip()
        pattern = _build_word_pattern(canonical_product)
        for match in pattern.finditer(content):
            matched_text = match.group(0)
            if matched_text != canonical_product:
                finding = Finding(
                    finding_id=f"DET-PROD-{idx}",
                    category=FindingCategory.BRAND_CONSISTENCY,
                    severity=Severity.MEDIUM,
                    status=FindingStatus.VIOLATION,
                    original_text=matched_text,
                    explanation=(
                        f"Product name '{matched_text}' does not match the canonical "
                        f"approved product name '{canonical_product}'."
                    ),
                    violated_guideline=f"Approved product name casing: {canonical_product}",
                    evidence=None,
                    suggestion=canonical_product,
                    confidence=1.0,
                )
                findings.append(finding)
                idx += 1

    return findings


def run_deterministic_checks(
    content: str,
    brand_guidelines: BrandGuidelines,
) -> List[Finding]:
    """
    Execute all deterministic checks and return collected findings.
    """
    findings: List[Finding] = []
    findings.extend(check_prohibited_terms(content, brand_guidelines))
    findings.extend(check_approved_terms_consistency(content, brand_guidelines))
    findings.extend(check_brand_name_consistency(content, brand_guidelines))
    findings.extend(check_product_names_consistency(content, brand_guidelines))
    return findings


def apply_deterministic_corrections(
    content: str,
    brand_guidelines: BrandGuidelines,
    findings: List[Finding],
) -> str:
    """
    Apply high-confidence deterministic corrections only to text associated with
    actual detected findings. Avoids accidentally capitalizing unrelated common words.
    Reuses _build_word_pattern to preserve punctuation and whitespace.
    """
    corrected = content
    if not findings:
        return corrected

    # Collect casing replacements strictly from detected findings
    casing_corrections = []
    for f in findings:
        if f.category in (FindingCategory.BRAND_CONSISTENCY, FindingCategory.TERMINOLOGY):
            if f.status == FindingStatus.VIOLATION and f.suggestion and f.original_text:
                # Ensure the suggestion is an exact casing correction (same word, differing case)
                if f.original_text.lower() == f.suggestion.lower() and f.original_text != f.suggestion:
                    casing_corrections.append((f.original_text, f.suggestion))

    # Apply only the verified finding replacements using _build_word_pattern
    for original, replacement in casing_corrections:
        pattern = _build_word_pattern(original)

        def _replace_match(m, orig=original, repl=replacement):
            if m.group(0) == orig:
                return repl
            return m.group(0)

        corrected = pattern.sub(_replace_match, corrected)

    return corrected
