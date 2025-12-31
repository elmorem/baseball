"""Tests for authentication security utilities."""

from datetime import timedelta


from app.auth.security import (
    ACCESS_TOKEN_TYPE,
    REFRESH_TOKEN_TYPE,
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
    verify_token,
)


class TestPasswordHashing:
    """Tests for password hashing functions."""

    def test_get_password_hash_returns_string(self):
        """Test that hashing returns a non-empty string."""
        password = "TestPassword123"
        hashed = get_password_hash(password)

        assert isinstance(hashed, str)
        assert len(hashed) > 0
        assert hashed != password

    def test_verify_password_correct(self):
        """Test verification with correct password."""
        password = "TestPassword123"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Test verification with incorrect password."""
        password = "TestPassword123"
        hashed = get_password_hash(password)

        assert verify_password("WrongPassword", hashed) is False

    def test_different_passwords_different_hashes(self):
        """Test that different passwords produce different hashes."""
        hash1 = get_password_hash("Password1")
        hash2 = get_password_hash("Password2")

        assert hash1 != hash2

    def test_same_password_different_hashes(self):
        """Test that same password produces different hashes (salt)."""
        password = "SamePassword123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        assert hash1 != hash2
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestAccessToken:
    """Tests for access token creation and verification."""

    def test_create_access_token(self):
        """Test access token creation."""
        data = {"sub": "user-123"}
        token = create_access_token(data)

        assert isinstance(token, str)
        assert len(token) > 0

    def test_verify_access_token(self):
        """Test access token verification."""
        user_id = "user-123"
        data = {"sub": user_id}
        token = create_access_token(data)

        payload = verify_token(token, expected_type=ACCESS_TOKEN_TYPE)

        assert payload is not None
        assert payload["sub"] == user_id
        assert payload["type"] == ACCESS_TOKEN_TYPE
        assert "exp" in payload
        assert "jti" in payload

    def test_access_token_with_custom_expiry(self):
        """Test access token with custom expiration."""
        data = {"sub": "user-123"}
        token = create_access_token(data, expires_delta=timedelta(hours=1))

        payload = verify_token(token, expected_type=ACCESS_TOKEN_TYPE)
        assert payload is not None

    def test_verify_access_token_wrong_type(self):
        """Test that access token fails refresh type check."""
        data = {"sub": "user-123"}
        token = create_access_token(data)

        payload = verify_token(token, expected_type=REFRESH_TOKEN_TYPE)
        assert payload is None


class TestRefreshToken:
    """Tests for refresh token creation and verification."""

    def test_create_refresh_token(self):
        """Test refresh token creation."""
        data = {"sub": "user-123"}
        token = create_refresh_token(data)

        assert isinstance(token, str)
        assert len(token) > 0

    def test_verify_refresh_token(self):
        """Test refresh token verification."""
        user_id = "user-123"
        data = {"sub": user_id}
        token = create_refresh_token(data)

        payload = verify_token(token, expected_type=REFRESH_TOKEN_TYPE)

        assert payload is not None
        assert payload["sub"] == user_id
        assert payload["type"] == REFRESH_TOKEN_TYPE
        assert "exp" in payload
        assert "jti" in payload

    def test_verify_refresh_token_wrong_type(self):
        """Test that refresh token fails access type check."""
        data = {"sub": "user-123"}
        token = create_refresh_token(data)

        payload = verify_token(token, expected_type=ACCESS_TOKEN_TYPE)
        assert payload is None


class TestTokenVerification:
    """Tests for token verification edge cases."""

    def test_verify_invalid_token(self):
        """Test verification of invalid token string."""
        payload = verify_token("invalid-token-string")
        assert payload is None

    def test_verify_empty_token(self):
        """Test verification of empty token."""
        payload = verify_token("")
        assert payload is None

    def test_verify_token_without_type_check(self):
        """Test verification without type checking."""
        data = {"sub": "user-123"}
        token = create_access_token(data)

        payload = verify_token(token)  # No expected_type
        assert payload is not None
        assert payload["sub"] == "user-123"

    def test_tokens_have_unique_jti(self):
        """Test that each token has a unique JTI."""
        data = {"sub": "user-123"}
        token1 = create_access_token(data)
        token2 = create_access_token(data)

        payload1 = verify_token(token1)
        payload2 = verify_token(token2)

        assert payload1["jti"] != payload2["jti"]
