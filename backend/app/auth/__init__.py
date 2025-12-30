"""Authentication module for the Baseball Stats API."""

from app.auth.dependencies import ActiveUser, CurrentUser
from app.auth.router import router as auth_router
from app.auth.schemas import (
    Token,
    TokenPayload,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.auth.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
    verify_token,
)
from app.auth.service import (
    authenticate_user,
    create_user,
    get_user_by_email,
    get_user_by_id,
    get_user_by_username,
)

__all__ = [
    # Router
    "auth_router",
    # Dependencies
    "ActiveUser",
    "CurrentUser",
    # Schemas
    "Token",
    "TokenPayload",
    "UserCreate",
    "UserLogin",
    "UserResponse",
    # Security
    "create_access_token",
    "create_refresh_token",
    "get_password_hash",
    "verify_password",
    "verify_token",
    # Service
    "authenticate_user",
    "create_user",
    "get_user_by_email",
    "get_user_by_id",
    "get_user_by_username",
]
