"""
Reality bRand Check AI - Input and Output Validators for AI Engine
"""

from typing import Any, List, Optional, Union
from pydantic import ValidationError

from .exceptions import (
    AIEngineError,
    AI_INVALID_RESPONSE,
    AI_VALIDATION_ERROR,
)
from .schemas import AnalysisInput, AnalysisResponse


def _format_validation_error(exc: ValidationError) -> str:
    """Format Pydantic ValidationError into a clean, safe string without internal paths."""
    errors = exc.errors()
    formatted = []
    for err in errors:
        loc = ".".join(str(part) for part in err.get("loc", []))
        msg = err.get("msg", "Validation failed")
        if loc:
            formatted.append(f"{loc}: {msg}")
        else:
            formatted.append(msg)
    return "; ".join(formatted) if formatted else "Invalid data format"


def validate_analysis_input(
    content: str,
    brand_guidelines: Optional[dict] = None,
    approved_facts: Optional[list] = None,
) -> AnalysisInput:
    """
    Validate and normalize input payload for brand content analysis.

    Args:
        content: The text content to analyze. Must be a non-empty string.
        brand_guidelines: Brand guidelines dictionary. Normalized to {} if None.
        approved_facts: List of approved fact dictionaries. Normalized to [] if None.

    Returns:
        AnalysisInput: Validated Pydantic model instance.

    Raises:
        AIEngineError: With code AI_VALIDATION_ERROR if validation fails.
    """
    # Normalize missing optional guidelines and facts
    if brand_guidelines is None:
        brand_guidelines = {}
    if approved_facts is None:
        approved_facts = []

    # Type validation
    if not isinstance(content, str):
        raise AIEngineError(
            code=AI_VALIDATION_ERROR,
            message="Content must be a string.",
        )

    if not content.strip():
        raise AIEngineError(
            code=AI_VALIDATION_ERROR,
            message="Content must be a non-empty string.",
        )

    if not isinstance(brand_guidelines, dict):
        raise AIEngineError(
            code=AI_VALIDATION_ERROR,
            message="Brand guidelines must be a dictionary.",
        )

    if not isinstance(approved_facts, list):
        raise AIEngineError(
            code=AI_VALIDATION_ERROR,
            message="Approved facts must be a list.",
        )

    # Validate against AnalysisInput schema
    try:
        return AnalysisInput(
            content=content,
            brand_guidelines=brand_guidelines,
            approved_facts=approved_facts,
        )
    except ValidationError as exc:
        clean_msg = _format_validation_error(exc)
        raise AIEngineError(
            code=AI_VALIDATION_ERROR,
            message=f"Invalid analysis input: {clean_msg}",
        ) from None
    except (TypeError, ValueError) as exc:
        raise AIEngineError(
            code=AI_VALIDATION_ERROR,
            message=f"Invalid analysis input: {str(exc)}",
        ) from None


def validate_analysis_output(
    response: Union[dict, AnalysisResponse],
) -> dict:
    """
    Validate the analysis output structure and return a JSON-compatible dictionary.

    Args:
        response: Dictionary representing AI analysis response or AnalysisResponse instance.

    Returns:
        dict: Validated JSON-compatible dictionary.

    Raises:
        AIEngineError: With code AI_INVALID_RESPONSE if response structure is invalid.
    """
    if isinstance(response, AnalysisResponse):
        return response.model_dump(mode="json")

    if not isinstance(response, dict):
        raise AIEngineError(
            code=AI_INVALID_RESPONSE,
            message="Analysis response must be a dictionary.",
        )

    try:
        validated = AnalysisResponse.model_validate(response)
        return validated.model_dump(mode="json")
    except ValidationError as exc:
        clean_msg = _format_validation_error(exc)
        raise AIEngineError(
            code=AI_INVALID_RESPONSE,
            message=f"Invalid analysis response format: {clean_msg}",
        ) from None
    except (TypeError, ValueError) as exc:
        raise AIEngineError(
            code=AI_INVALID_RESPONSE,
            message=f"Invalid analysis response structure: {str(exc)}",
        ) from None
