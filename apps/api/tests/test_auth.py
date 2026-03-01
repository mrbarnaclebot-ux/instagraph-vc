import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
import jwt as pyjwt

from app.auth.clerk import get_current_user, get_optional_user


class TestGetCurrentUser:
    @pytest.mark.asyncio
    async def test_dev_bypass_returns_dev_user(self):
        with patch("app.auth.clerk.settings") as mock_settings:
            mock_settings.dev_skip_auth = True
            mock_settings.clerk_authorized_party = "http://localhost:3000"
            result = await get_current_user(credentials=None)
            assert result["sub"] == "dev-user"
            assert result["azp"] == "http://localhost:3000"

    @pytest.mark.asyncio
    async def test_dev_bypass_extracts_real_sub_from_token(self):
        """In dev mode with a real JWT present, decode sub without verification."""
        # Create a token with a known sub (unsigned / HS256 for test convenience)
        token = pyjwt.encode({"sub": "user_real_123", "azp": "http://localhost:3000"}, "secret", algorithm="HS256")
        creds = MagicMock()
        creds.credentials = token

        with patch("app.auth.clerk.settings") as mock_settings:
            mock_settings.dev_skip_auth = True
            mock_settings.clerk_authorized_party = "http://localhost:3000"
            result = await get_current_user(credentials=creds)
            assert result["sub"] == "user_real_123"

    @pytest.mark.asyncio
    async def test_dev_bypass_falls_back_on_bad_token(self):
        """In dev mode, a malformed token should fall through to dev-user."""
        creds = MagicMock()
        creds.credentials = "not.a.valid.jwt"

        with patch("app.auth.clerk.settings") as mock_settings:
            mock_settings.dev_skip_auth = True
            mock_settings.clerk_authorized_party = "http://localhost:3000"
            result = await get_current_user(credentials=creds)
            assert result["sub"] == "dev-user"

    @pytest.mark.asyncio
    async def test_missing_credentials_raises_401(self):
        with patch("app.auth.clerk.settings") as mock_settings:
            mock_settings.dev_skip_auth = False
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(credentials=None)
            assert exc_info.value.status_code == 401
            assert exc_info.value.detail["error"] == "unauthorized"
            assert "Missing" in exc_info.value.detail["message"]

    @pytest.mark.asyncio
    async def test_expired_token_raises_401(self):
        creds = MagicMock()
        creds.credentials = "expired.jwt.token"

        mock_signing_key = MagicMock()
        mock_signing_key.key = "test-key"

        with patch("app.auth.clerk.settings") as mock_settings:
            mock_settings.dev_skip_auth = False
            with patch("app.auth.clerk._get_jwks_client") as mock_jwks:
                mock_jwks.return_value.get_signing_key_from_jwt.return_value = mock_signing_key
                with patch("app.auth.clerk.jwt.decode", side_effect=pyjwt.ExpiredSignatureError("expired")):
                    with pytest.raises(HTTPException) as exc_info:
                        await get_current_user(credentials=creds)
                    assert exc_info.value.status_code == 401
                    assert "expired" in exc_info.value.detail["message"].lower()

    @pytest.mark.asyncio
    async def test_invalid_token_raises_401(self):
        creds = MagicMock()
        creds.credentials = "bad.jwt.token"

        mock_signing_key = MagicMock()
        mock_signing_key.key = "test-key"

        with patch("app.auth.clerk.settings") as mock_settings:
            mock_settings.dev_skip_auth = False
            with patch("app.auth.clerk._get_jwks_client") as mock_jwks:
                mock_jwks.return_value.get_signing_key_from_jwt.return_value = mock_signing_key
                with patch("app.auth.clerk.jwt.decode", side_effect=pyjwt.DecodeError("bad")):
                    with pytest.raises(HTTPException) as exc_info:
                        await get_current_user(credentials=creds)
                    assert exc_info.value.status_code == 401
                    assert "Invalid token" in exc_info.value.detail["message"]

    @pytest.mark.asyncio
    async def test_valid_token_returns_payload(self):
        creds = MagicMock()
        creds.credentials = "valid.jwt.token"
        payload = {"sub": "user_abc", "azp": "http://localhost:3000"}

        mock_signing_key = MagicMock()
        mock_signing_key.key = "test-key"

        with patch("app.auth.clerk.settings") as mock_settings:
            mock_settings.dev_skip_auth = False
            mock_settings.clerk_authorized_party = "http://localhost:3000"
            with patch("app.auth.clerk._get_jwks_client") as mock_jwks:
                mock_jwks.return_value.get_signing_key_from_jwt.return_value = mock_signing_key
                with patch("app.auth.clerk.jwt.decode", return_value=payload):
                    result = await get_current_user(credentials=creds)
                    assert result["sub"] == "user_abc"

    @pytest.mark.asyncio
    async def test_wrong_azp_raises_401(self):
        creds = MagicMock()
        creds.credentials = "valid.jwt.token"
        payload = {"sub": "user_abc", "azp": "https://evil-app.com"}

        mock_signing_key = MagicMock()
        mock_signing_key.key = "test-key"

        with patch("app.auth.clerk.settings") as mock_settings:
            mock_settings.dev_skip_auth = False
            mock_settings.clerk_authorized_party = "http://localhost:3000"
            with patch("app.auth.clerk._get_jwks_client") as mock_jwks:
                mock_jwks.return_value.get_signing_key_from_jwt.return_value = mock_signing_key
                with patch("app.auth.clerk.jwt.decode", return_value=payload):
                    with pytest.raises(HTTPException) as exc_info:
                        await get_current_user(credentials=creds)
                    assert exc_info.value.status_code == 401
                    assert "claim" in exc_info.value.detail["message"].lower()

    @pytest.mark.asyncio
    async def test_jwks_failure_raises_401(self):
        creds = MagicMock()
        creds.credentials = "some.jwt.token"

        with patch("app.auth.clerk.settings") as mock_settings:
            mock_settings.dev_skip_auth = False
            with patch("app.auth.clerk._get_jwks_client") as mock_jwks:
                mock_jwks.return_value.get_signing_key_from_jwt.side_effect = Exception("JWKS unreachable")
                with pytest.raises(HTTPException) as exc_info:
                    await get_current_user(credentials=creds)
                assert exc_info.value.status_code == 401
                assert "verification failed" in exc_info.value.detail["message"].lower()


class TestGetOptionalUser:
    @pytest.mark.asyncio
    async def test_returns_none_without_credentials(self):
        result = await get_optional_user(credentials=None)
        assert result is None

    @pytest.mark.asyncio
    async def test_validates_when_token_present(self):
        creds = MagicMock()
        creds.credentials = "some.jwt.token"

        with patch("app.auth.clerk.settings") as mock_settings:
            mock_settings.dev_skip_auth = False
            with patch("app.auth.clerk._get_jwks_client") as mock_jwks:
                mock_jwks.return_value.get_signing_key_from_jwt.side_effect = pyjwt.DecodeError("bad")
                with pytest.raises(HTTPException) as exc_info:
                    await get_optional_user(credentials=creds)
                assert exc_info.value.status_code == 401
