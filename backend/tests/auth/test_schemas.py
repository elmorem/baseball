"""Tests for authentication Pydantic schemas."""

from datetime import datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.auth.schemas import Token, TokenPayload, UserCreate, UserLogin, UserResponse


class TestUserCreate:
    """Tests for UserCreate schema validation."""

    def test_valid_user_create(self):
        """Test valid user creation data."""
        user = UserCreate(
            email="test@example.com",
            username="testuser",
            password="TestPass123",
        )
        assert user.email == "test@example.com"
        assert user.username == "testuser"
        assert user.password == "TestPass123"

    def test_username_lowercase(self):
        """Test that username is converted to lowercase."""
        user = UserCreate(
            email="test@example.com",
            username="TestUser",
            password="TestPass123",
        )
        assert user.username == "testuser"

    def test_username_with_underscore(self):
        """Test username with underscores is valid."""
        user = UserCreate(
            email="test@example.com",
            username="test_user",
            password="TestPass123",
        )
        assert user.username == "test_user"

    def test_username_too_short(self):
        """Test username minimum length validation."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="test@example.com",
                username="ab",
                password="TestPass123",
            )
        assert "String should have at least 3 characters" in str(exc_info.value)

    def test_username_too_long(self):
        """Test username maximum length validation."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="test@example.com",
                username="a" * 51,
                password="TestPass123",
            )
        assert "String should have at most 50 characters" in str(exc_info.value)

    def test_username_invalid_characters(self):
        """Test username with invalid characters."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="test@example.com",
                username="test-user",
                password="TestPass123",
            )
        assert "alphanumeric" in str(exc_info.value).lower()

    def test_invalid_email(self):
        """Test invalid email validation."""
        with pytest.raises(ValidationError):
            UserCreate(
                email="not-an-email",
                username="testuser",
                password="TestPass123",
            )

    def test_password_too_short(self):
        """Test password minimum length validation."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="test@example.com",
                username="testuser",
                password="Short1",
            )
        assert "String should have at least 8 characters" in str(exc_info.value)

    def test_password_no_uppercase(self):
        """Test password requires uppercase letter."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="test@example.com",
                username="testuser",
                password="testpass123",
            )
        assert "uppercase" in str(exc_info.value).lower()

    def test_password_no_lowercase(self):
        """Test password requires lowercase letter."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="test@example.com",
                username="testuser",
                password="TESTPASS123",
            )
        assert "lowercase" in str(exc_info.value).lower()

    def test_password_no_digit(self):
        """Test password requires digit."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="test@example.com",
                username="testuser",
                password="TestPassword",
            )
        assert "digit" in str(exc_info.value).lower()


class TestUserLogin:
    """Tests for UserLogin schema."""

    def test_valid_login(self):
        """Test valid login data."""
        login = UserLogin(
            email="test@example.com",
            password="anypassword",
        )
        assert login.email == "test@example.com"
        assert login.password == "anypassword"

    def test_invalid_email(self):
        """Test invalid email in login."""
        with pytest.raises(ValidationError):
            UserLogin(
                email="not-an-email",
                password="password",
            )


class TestUserResponse:
    """Tests for UserResponse schema."""

    def test_valid_response(self):
        """Test valid user response."""
        user_id = uuid4()
        now = datetime.now()

        response = UserResponse(
            id=user_id,
            email="test@example.com",
            username="testuser",
            is_active=True,
            created_at=now,
        )

        assert response.id == user_id
        assert response.email == "test@example.com"
        assert response.username == "testuser"
        assert response.is_active is True
        assert response.created_at == now


class TestToken:
    """Tests for Token schema."""

    def test_valid_token(self):
        """Test valid token response."""
        token = Token(
            access_token="access.token.here",
            refresh_token="refresh.token.here",
        )

        assert token.access_token == "access.token.here"
        assert token.refresh_token == "refresh.token.here"
        assert token.token_type == "bearer"

    def test_custom_token_type(self):
        """Test token with custom type."""
        token = Token(
            access_token="access.token.here",
            refresh_token="refresh.token.here",
            token_type="custom",
        )

        assert token.token_type == "custom"


class TestTokenPayload:
    """Tests for TokenPayload schema."""

    def test_valid_payload(self):
        """Test valid token payload."""
        now = datetime.now()

        payload = TokenPayload(
            sub="user-123",
            exp=now,
            type="access",
            jti="unique-id",
        )

        assert payload.sub == "user-123"
        assert payload.exp == now
        assert payload.type == "access"
        assert payload.jti == "unique-id"
