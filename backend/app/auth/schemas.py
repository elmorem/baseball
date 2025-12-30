"""Pydantic schemas for authentication."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    """Schema for user registration."""

    email: EmailStr = Field(..., description="User's email address")
    username: str = Field(
        ..., min_length=3, max_length=50, description="Username (3-50 characters)"
    )
    password: str = Field(
        ..., min_length=8, max_length=128, description="Password (min 8 characters)"
    )

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        """Ensure username contains only alphanumeric characters and underscores."""
        if not v.replace("_", "").isalnum():
            raise ValueError("Username must be alphanumeric (underscores allowed)")
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Validate password has minimum strength requirements."""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")


class UserResponse(BaseModel):
    """Schema for user response (excludes sensitive data)."""

    id: UUID = Field(..., description="User's unique identifier")
    email: EmailStr = Field(..., description="User's email address")
    username: str = Field(..., description="User's username")
    is_active: bool = Field(..., description="Whether the user account is active")
    created_at: datetime = Field(..., description="Account creation timestamp")

    model_config = {"from_attributes": True}


class Token(BaseModel):
    """Schema for authentication token response."""

    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")


class TokenPayload(BaseModel):
    """Schema for JWT token payload."""

    sub: str = Field(..., description="Subject (user ID)")
    exp: datetime = Field(..., description="Expiration timestamp")
    type: str = Field(..., description="Token type (access or refresh)")
    jti: str = Field(..., description="JWT ID for token identification")
