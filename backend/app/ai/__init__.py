"""
Reality bRand Check AI - AI Engine Package
"""

try:
    from .analyzer import analyze_brand_content
    from .gemini_client import GeminiClient, GeminiConfig
    HAS_GEMINI_CLIENT = True
except (ImportError, ModuleNotFoundError):
    analyze_brand_content = None  # type: ignore
    GeminiClient = None  # type: ignore
    GeminiConfig = None  # type: ignore
    HAS_GEMINI_CLIENT = False

from .exceptions import (
    AIEngineError,
    AI_API_ERROR,
    AI_TIMEOUT,
    AI_INVALID_RESPONSE,
    AI_VALIDATION_ERROR,
    AI_CONFIGURATION_ERROR,
    SUPPORTED_ERROR_CODES,
)
from .gemini_client import (
    GeminiClient,
    GeminiConfig,
)
from .prompts import (
    build_analysis_prompt,
    build_approved_facts_section,
    build_brand_guidelines_section,
    get_system_instruction,
)
from .rule_checker import (
    apply_deterministic_corrections,
    run_deterministic_checks,
)
from .schemas import (
    OverallStatus,
    FindingCategory,
    Severity,
    FindingStatus,
    BrandGuidelines,
    ApprovedFact,
    AnalysisInput,
    Finding,
    AnalysisResponse,
)
from .validators import (
    validate_analysis_input,
    validate_analysis_output,
)

__all__ = [
    # Main Engine Analyzer
    "analyze_brand_content",
    # Custom Exceptions
    "AIEngineError",
    "AI_API_ERROR",
    "AI_TIMEOUT",
    "AI_INVALID_RESPONSE",
    "AI_VALIDATION_ERROR",
    "AI_CONFIGURATION_ERROR",
    "SUPPORTED_ERROR_CODES",
    # Enums
    "OverallStatus",
    "FindingCategory",
    "Severity",
    "FindingStatus",
    # Schemas
    "BrandGuidelines",
    "ApprovedFact",
    "AnalysisInput",
    "Finding",
    "AnalysisResponse",
    # Validators
    "validate_analysis_input",
    "validate_analysis_output",
    # Deterministic Rule Checks
    "run_deterministic_checks",
    "apply_deterministic_corrections",
    # Gemini Client & Prompts
    "GeminiClient",
    "GeminiConfig",
    "get_system_instruction",
    "build_analysis_prompt",
    "build_brand_guidelines_section",
    "build_approved_facts_section",
]
