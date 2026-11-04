from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import bcrypt
import jwt
from app.core.config import settings
from app.core.errors import UnauthorizedException

ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password or not plain_password:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": now,
        # Default aud to authenticated matching Supabase JWT conventions
        "aud": to_encode.get("aud", "authenticated"),
    })
    
    secret = settings.SUPABASE_JWT_SECRET if settings.SUPABASE_JWT_SECRET else settings.SECRET_KEY
    return jwt.encode(to_encode, secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decodes and verifies a JWT token.
    Compatible with both Supabase JWTs and self-issued tokens.
    """
    secrets_to_try = [s for s in [settings.SUPABASE_JWT_SECRET, settings.SECRET_KEY] if s]
    
    last_error = None
    for secret in secrets_to_try:
        try:
            # Note: audience check is set to authenticated or ignored if not set
            payload = jwt.decode(
                token,
                secret,
                algorithms=[ALGORITHM],
                options={"verify_aud": False}
            )
            return payload
        except jwt.PyJWTError as e:
            last_error = e
            continue
            
    raise UnauthorizedException(f"Invalid or expired authentication token: {str(last_error)}")

