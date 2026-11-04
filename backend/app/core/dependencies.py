from typing import Callable, List, Optional
from fastapi import Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.errors import ForbiddenException, UnauthorizedException
from app.core.security import decode_access_token
from app.database.connection import get_db
from app.models.profile import Profile

security_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> Profile:
    if not credentials:
        raise UnauthorizedException("Authorization header with Bearer token is missing.")

    payload = decode_access_token(credentials.credentials)
    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Token payload missing user identifier ('sub').")

    profile = db.query(Profile).filter(Profile.id == user_id).first()

    # If user profile doesn't exist locally (e.g. initial sign-in via Supabase), auto-provision profile
    if not profile:
        email = payload.get("email", f"{user_id}@supabase.auth")
        metadata = payload.get("user_metadata", {})
        full_name = metadata.get("full_name") or payload.get("full_name") or email.split("@")[0]
        role = metadata.get("role") or payload.get("role", "EDITOR")
        workspace_id = metadata.get("workspace_id") or payload.get("workspace_id", "default-workspace")

        profile = Profile(
            id=user_id,
            email=email,
            full_name=full_name,
            role=role,
            workspace_id=workspace_id,
            is_active=True,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    if not profile.is_active:
        raise ForbiddenException("User account is inactive.")

    return profile


def require_roles(allowed_roles: List[str]) -> Callable[[Profile], Profile]:
    def role_checker(current_user: Profile = Depends(get_current_user)) -> Profile:
        if current_user.role not in allowed_roles:
            raise ForbiddenException(
                f"Role '{current_user.role}' is not authorized. Allowed roles: {', '.join(allowed_roles)}"
            )
        return current_user

    return role_checker


# Role dependencies
require_admin = require_roles(["ADMIN"])
require_reviewer = require_roles(["ADMIN", "REVIEWER"])
require_editor = require_roles(["ADMIN", "EDITOR", "REVIEWER"])

