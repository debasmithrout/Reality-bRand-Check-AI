"""
Reality bRand Check AI - Task 3 Gemini Configuration Validation Tests
Verifies:
1. Missing API key produces clear AI_CONFIGURATION_ERROR
2. Invalid API key produces sanitized authentication error (never leaks credentials)
3. Invalid model identifier produces sanitized model error (no silent fallback)
4. Timeout configuration is validated and timeout exceptions produce AI_TIMEOUT
5. Selected model is correctly passed to Google GenAI SDK client
6. No secrets exposed in exceptions, string representations, or logs
"""

import pytest
from unittest.mock import MagicMock
from google.genai import errors

from app.ai.exceptions import (
    AIEngineError,
    AI_CONFIGURATION_ERROR,
    AI_TIMEOUT,
    AI_API_ERROR,
)
from app.ai.gemini_client import (
    GeminiClient,
    GeminiConfig,
    _sanitize_message,
)
from app.core.config import settings


def test_missing_api_key_produces_safe_error():
    """Verify missing API key produces clear AI_CONFIGURATION_ERROR."""
    with pytest.raises(AIEngineError) as exc_info:
        GeminiConfig.from_env(api_key="")
    assert exc_info.value.code == AI_CONFIGURATION_ERROR
    assert "GEMINI_API_KEY is not configured" in exc_info.value.message


def test_invalid_api_key_sanitized_authentication_error():
    """Verify invalid API key error redacts the key and never leaks credentials."""
    secret_key = "AIzaSyFakeSecretKeyThatMustBeRedacted123"
    mock_sdk_client = MagicMock()
    mock_sdk_client.models.generate_content.side_effect = errors.APIError(
        400,
        {"error": {"message": f"API key not valid: {secret_key}. Please pass a valid key."}},
    )

    client = GeminiClient(api_key=secret_key, client=mock_sdk_client)

    with pytest.raises(AIEngineError) as exc_info:
        client.generate_content("test prompt")

    assert exc_info.value.code == AI_API_ERROR
    # Crucial: raw secret MUST NOT appear in the exception message
    assert secret_key not in exc_info.value.message
    assert "[REDACTED_API_KEY]" in exc_info.value.message


def test_invalid_model_identifier_produces_sanitized_error():
    """Verify invalid model identifier produces clear error and does not silently fall back."""
    mock_sdk_client = MagicMock()
    mock_sdk_client.models.generate_content.side_effect = errors.APIError(
        404,
        {"error": {"message": "models/gemini-unknown-model-xyz is not found for API version v1beta"}},
    )

    client = GeminiClient(
        api_key="valid-dummy-key",
        model="gemini-unknown-model-xyz",
        client=mock_sdk_client,
    )

    with pytest.raises(AIEngineError) as exc_info:
        client.generate_content("test prompt")

    assert exc_info.value.code == AI_API_ERROR
    assert "404" in exc_info.value.message
    assert "gemini-unknown-model-xyz is not found" in exc_info.value.message


def test_timeout_is_respected_and_validated():
    """Verify invalid timeout is rejected and provider timeout raises AI_TIMEOUT."""
    # 1. Negative timeout rejected
    with pytest.raises(AIEngineError) as exc_conf:
        GeminiConfig.from_env(api_key="valid-key", timeout=-5.0)
    assert exc_conf.value.code == AI_CONFIGURATION_ERROR
    assert "Timeout must be a positive number" in exc_conf.value.message

    # 2. Provider timeout triggers AI_TIMEOUT
    mock_sdk_client = MagicMock()
    mock_sdk_client.models.generate_content.side_effect = TimeoutError("Deadline exceeded waiting for Gemini")

    client = GeminiClient(api_key="valid-key", timeout=10.0, client=mock_sdk_client)
    with pytest.raises(AIEngineError) as exc_timeout:
        client.generate_content("test prompt")

    assert exc_timeout.value.code == AI_TIMEOUT
    assert "timed out" in exc_timeout.value.message.lower()


def test_selected_model_correctly_passed_to_sdk():
    """Verify configured model is explicitly dispatched to models.generate_content."""
    mock_sdk_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = '{"overall_status": "PASS", "summary": "Ok", "findings": []}'
    mock_sdk_client.models.generate_content.return_value = mock_response

    custom_model = "gemini-3.5-flash"
    client = GeminiClient(
        api_key="valid-key",
        model=custom_model,
        client=mock_sdk_client,
    )

    client.generate_content("test prompt")

    mock_sdk_client.models.generate_content.assert_called_once()
    call_kwargs = mock_sdk_client.models.generate_content.call_args.kwargs
    assert call_kwargs["model"] == custom_model


def test_no_secret_exposed_in_sanitizer():
    """Verify _sanitize_message redacts various key patterns."""
    raw_message = "Failed calling key=some_secret_key and key AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q"
    sanitized = _sanitize_message(raw_message, "AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q")

    assert "AIzaSy" not in sanitized
    assert "some_secret_key" not in sanitized
    assert "[REDACTED]" in sanitized
