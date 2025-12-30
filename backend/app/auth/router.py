"""FastAPI router for authentication endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import ActiveUser
from app.auth.schemas import Token, UserCreate, UserResponse
from app.auth.security import (
    REFRESH_TOKEN_TYPE,
    create_access_token,
    create_refresh_token,
    verify_token,
)
from app.auth.service import (
    authenticate_user,
    create_user,
    get_user_by_email,
    get_user_by_username,
)
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(
    user_create: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    """Register a new user account.

    Args:
        user_create: User registration data.
        db: Database session.

    Returns:
        Newly created user information.

    Raises:
        HTTPException: If email or username already exists.
    """
    # Check if email already exists
    existing_email = await get_user_by_email(db, user_create.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Check if username already exists
    existing_username = await get_user_by_username(db, user_create.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    user = await create_user(db, user_create)
    return UserResponse.model_validate(user)


@router.post(
    "/login",
    response_model=Token,
    summary="Login and get access token",
)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Token:
    """Authenticate user and return JWT tokens.

    Uses OAuth2 password flow. The username field accepts email.

    Args:
        form_data: OAuth2 form with username (email) and password.
        db: Database session.

    Returns:
        Access and refresh tokens.

    Raises:
        HTTPException: If credentials are invalid.
    """
    user = await authenticate_user(db, form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    # Create tokens with user ID as subject
    token_data = {"sub": str(user.id)}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post(
    "/refresh",
    response_model=Token,
    summary="Refresh access token",
)
async def refresh_token(
    refresh_token: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Token:
    """Get a new access token using a refresh token.

    Args:
        refresh_token: Valid refresh token.
        db: Database session.

    Returns:
        New access and refresh tokens.

    Raises:
        HTTPException: If refresh token is invalid or expired.
    """
    payload = verify_token(refresh_token, expected_type=REFRESH_TOKEN_TYPE)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create new tokens
    token_data = {"sub": payload["sub"]}
    new_access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)

    return Token(access_token=new_access_token, refresh_token=new_refresh_token)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
)
async def get_current_user_info(
    current_user: ActiveUser,
) -> UserResponse:
    """Get the current authenticated user's information.

    Args:
        current_user: Currently authenticated active user.

    Returns:
        Current user information.
    """
    return UserResponse.model_validate(current_user)
