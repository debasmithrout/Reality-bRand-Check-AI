"""
Reality bRand Check AI - Custom Exceptions for AI Engine
"""

from typing import Set

# Supported Error Codes
AI_API_ERROR: str = "AI_API_ERROR"
AI_TIMEOUT: str = "AI_TIMEOUT"
AI_INVALID_RESPONSE: str = "AI_INVALID_RESPONSE"
AI_VALIDATION_ERROR: str = "AI_VALIDATION_ERROR"
AI_CONFIGURATION_ERROR: str = "AI_CONFIGURATION_ERROR"

SUPPORTED_ERROR_CODES: Set[str] = {
    AI_API_ERROR,
    AI_TIMEOUT,
    AI_INVALID_RESPONSE,
    AI_VALIDATION_ERROR,
    AI_CONFIGURATION_ERROR,
}


class AIEngineError(Exception):
    """
    Base domain exception for all AI Engine operations.

    This exception is independent of FastAPI, HTTP status codes,
    and database dependencies.
    """

    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)

    def __str__(self) -> str:
        return f"[{self.code}] {self.message}"

    def __repr__(self) -> str:
        return f"AIEngineError(code={self.code!r}, message={self.message!r})"
