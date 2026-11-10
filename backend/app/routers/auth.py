from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.errors import ConflictException, UnauthorizedException
from app.core.security import create_access_token, get_password_hash, verify_password
from app.database.connection import get_db
from app.models.profile import Profile
from app.schemas.auth import TokenResponse, UserLogin, UserProfileResponse, UserRegister
from app.schemas.common import APIResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me", response_model=APIResponse[UserProfileResponse])
def get_me(current_user: Profile = Depends(get_current_user)):
    """
    Retrieve current authenticated user profile.
    """
    return APIResponse(data=UserProfileResponse.model_validate(current_user))


@router.post("/register", response_model=APIResponse[TokenResponse], status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user profile and issue JWT token (development / standalone auth).
    """
    existing_user = db.query(Profile).filter(Profile.email == payload.email).first()
    if existing_user:
        raise ConflictException(f"User with email '{payload.email}' already exists.")

    hashed_pw = get_password_hash(payload.password)
    user = Profile(
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role or "EDITOR",
        workspace_id=payload.workspace_id or "default-workspace",
        hashed_password=hashed_pw,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "workspace_id": user.workspace_id,
        "full_name": user.full_name,
    })

    return APIResponse(
        data=TokenResponse(access_token=token, token_type="bearer", expires_in=60 * 24 * 7 * 60),
        message="User registered successfully.",
    )


@router.post("/login", response_model=APIResponse[TokenResponse])
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate with email and password and issue JWT token.
    """
    user = db.query(Profile).filter(Profile.email == payload.email).first()
    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise UnauthorizedException("Invalid email or password.")

    if not user.is_active:
        raise UnauthorizedException("User account is inactive.")

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "workspace_id": user.workspace_id,
        "full_name": user.full_name,
    })

    return APIResponse(
        data=TokenResponse(access_token=token, token_type="bearer", expires_in=60 * 24 * 7 * 60),
        message="Login successful.",
    )

