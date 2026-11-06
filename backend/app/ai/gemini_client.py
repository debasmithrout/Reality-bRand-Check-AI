"""
Reality bRand Check AI - Gemini API Client for AI Engine
"""

import json
import os
import re
from dataclasses import dataclass
from typing import Any, Dict, Optional, Union

import httpx
from google import genai
from google.genai import errors, types

from .exceptions import (
    AIEngineError,
    AI_API_ERROR,
    AI_CONFIGURATION_ERROR,
    AI_INVALID_RESPONSE,
    AI_TIMEOUT,
)
from .prompts import get_system_instruction
from .schemas import AnalysisResponse
from .validators import validate_analysis_output

DEFAULT_GEMINI_MODEL: str = "gemini-3.5-flash"
DEFAULT_TIMEOUT_SECONDS: float = 30.0


def _sanitize_message(message: str, secret: Optional[str] = None) -> str:
    """
    Remove sensitive API keys and provider tokens from error strings.
    Prevents leaking credentials in exceptions or logs.
    """
    if not message:
        return ""
    sanitized = message
    if secret and secret in sanitized:
        sanitized = sanitized.replace(secret, "[REDACTED_API_KEY]")
    # Redact common Gemini API key pattern (AIzaSy...)
    sanitized = re.sub(r"AIza[0-9A-Za-z\-_]{35}", "[REDACTED_API_KEY]", sanitized)
    # Redact key=... query parameters or headers
    sanitized = re.sub(r"(api_key|key|token)=([^\s&]+)", r"\1=[REDACTED]", sanitized, flags=re.IGNORECASE)
    return sanitized


@dataclass
class GeminiConfig:
    """Configuration settings for Gemini API Client."""
    api_key: str
    model: str = DEFAULT_GEMINI_MODEL
    timeout: float = DEFAULT_TIMEOUT_SECONDS

    @classmethod
    def from_env(
        cls,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> "GeminiConfig":
        """
        Load and validate configuration from arguments or environment variables.

        Raises:
            AIEngineError: With code AI_CONFIGURATION_ERROR if required settings are missing or invalid.
        """
        resolved_key = (api_key or os.getenv("GEMINI_API_KEY") or "").strip()
        if not resolved_key:
            raise AIEngineError(
                code=AI_CONFIGURATION_ERROR,
                message="GEMINI_API_KEY is not configured. Provide it via argument or environment variable.",
            )

        resolved_model = (model or os.getenv("GEMINI_MODEL") or DEFAULT_GEMINI_MODEL).strip()
        if not resolved_model:
            resolved_model = DEFAULT_GEMINI_MODEL

        raw_timeout = timeout if timeout is not None else os.getenv("GEMINI_TIMEOUT")
        if raw_timeout is not None:
            try:
                resolved_timeout = float(raw_timeout)
                if resolved_timeout <= 0:
                    raise ValueError("Timeout must be a positive number.")
            except (ValueError, TypeError) as exc:
                raise AIEngineError(
                    code=AI_CONFIGURATION_ERROR,
                    message=f"Invalid GEMINI_TIMEOUT: {exc}",
                ) from None
        else:
            resolved_timeout = DEFAULT_TIMEOUT_SECONDS

        return cls(
            api_key=resolved_key,
            model=resolved_model,
            timeout=resolved_timeout,
        )


def _clean_fenced_json(text: str) -> str:
    """
    Safely extract JSON text when response is fully enclosed in a Markdown code fence.
    Does NOT blindly extract JSON embedded inside arbitrary prose.
    """
    trimmed = text.strip()
    if trimmed.startswith("```"):
        # Match only when the entire response body is cleanly enclosed in a code fence
        match = re.match(r"^```(?:json)?\s*\n?([\s\S]*?)\n?```$", trimmed, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return trimmed


class GeminiClient:
    """
    Secure, modular client for interacting with the Google Gemini API.

    Handles configuration, structured output generation, error sanitization,
    and schema validation without coupling to FastAPI or database components.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
        client: Optional[Any] = None,
    ):
        """
        Initialize the Gemini Client.
        Does not perform any network calls during initialization.

        Args:
            api_key: Gemini API key (defaults to GEMINI_API_KEY env var).
            model: Model identifier (defaults to GEMINI_MODEL env var or gemini-3.5-flash).
            timeout: Request timeout in seconds (defaults to GEMINI_TIMEOUT or 30.0s).
            client: Optional injected GenAI SDK client (useful for unit testing).
        """
        self.config = GeminiConfig.from_env(api_key=api_key, model=model, timeout=timeout)

        # Timeout in milliseconds for HttpOptions
        timeout_ms = int(self.config.timeout * 1000)
        self._http_options = types.HttpOptions(timeout=timeout_ms)

        if client is not None:
            self._client = client
        else:
            self._client = genai.Client(
                api_key=self.config.api_key,
                http_options=self._http_options,
            )

    def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Invoke the Gemini model and return a validated JSON-compatible response dictionary.

        Args:
            prompt: Formatted user prompt.
            system_instruction: Optional system instruction override.

        Returns:
            Dict[str, Any]: Validated dictionary adhering to AnalysisResponse schema.

        Raises:
            AIEngineError: With appropriate error code on failure:
                - AI_TIMEOUT: On network or provider timeouts.
                - AI_API_ERROR: On network, connection, or provider API errors.
                - AI_INVALID_RESPONSE: On empty, malformed, or invalid schema responses.
        """
        instruction = system_instruction if system_instruction is not None else get_system_instruction()

        # Configure structured response with Pydantic schema
        config = types.GenerateContentConfig(
            system_instruction=instruction,
            response_mime_type="application/json",
            response_schema=AnalysisResponse,
            temperature=0.1,
            http_options=self._http_options,
        )

        try:
            response = self._client.models.generate_content(
                model=self.config.model,
                contents=prompt,
                config=config,
            )
        except (httpx.TimeoutException, TimeoutError) as exc:
            raise AIEngineError(
                code=AI_TIMEOUT,
                message="Gemini API request timed out.",
            ) from None
        except errors.APIError as exc:
            msg = getattr(exc, "message", str(exc))
            code = getattr(exc, "code", None)
            if code in (408, 504) or "deadline" in msg.lower() or "timeout" in msg.lower():
                raise AIEngineError(
                    code=AI_TIMEOUT,
                    message="Gemini API request timed out.",
                ) from None
            sanitized = _sanitize_message(msg, self.config.api_key)
            raise AIEngineError(
                code=AI_API_ERROR,
                message=f"Gemini API error ({code}): {sanitized}",
            ) from None
        except (httpx.NetworkError, httpx.HTTPError, ConnectionError) as exc:
            sanitized = _sanitize_message(str(exc), self.config.api_key)
            raise AIEngineError(
                code=AI_API_ERROR,
                message=f"Network error communicating with Gemini API: {sanitized}",
            ) from None
        except Exception as exc:
            # Re-raise AIEngineError if already wrapped
            if isinstance(exc, AIEngineError):
                raise
            err_str = str(exc)
            if "timeout" in err_str.lower():
                raise AIEngineError(
                    code=AI_TIMEOUT,
                    message="Gemini API request timed out.",
                ) from None
            sanitized = _sanitize_message(err_str, self.config.api_key)
            raise AIEngineError(
                code=AI_API_ERROR,
                message=f"Gemini API invocation failed: {sanitized}",
            ) from None

        # Verify response text exists
        raw_text = getattr(response, "text", None)
        if not raw_text or not raw_text.strip():
            raise AIEngineError(
                code=AI_INVALID_RESPONSE,
                message="Gemini API returned an empty response.",
            )

        # Clean Markdown code fence if cleanly enclosed
        clean_text = _clean_fenced_json(raw_text)

        # Parse JSON
        try:
            parsed_data = json.loads(clean_text)
        except (json.JSONDecodeError, TypeError) as exc:
            raise AIEngineError(
                code=AI_INVALID_RESPONSE,
                message=f"Gemini API returned malformed non-JSON output: {exc}",
            ) from None

        # Validate against AnalysisResponse schema
        return validate_analysis_output(parsed_data)
