import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from app.ratelimit.limiter import check_rate_limit, get_usage, _build_limiters


class TestCheckRateLimit:
    def test_noop_when_redis_is_none(self):
        check_rate_limit(None, "user_123", "1.2.3.4")  # should not raise

    def test_raises_429_when_not_allowed(self):
        redis = MagicMock()
        mock_result = MagicMock()
        mock_result.allowed = False
        mock_result.reset = 1000000000 + 3600  # future timestamp

        with patch("app.ratelimit.limiter._build_limiters") as mock_build:
            mock_limiter = MagicMock()
            mock_limiter.limit.return_value = mock_result
            mock_build.return_value = (mock_limiter, mock_limiter)

            with pytest.raises(HTTPException) as exc_info:
                check_rate_limit(redis, "user_123", "1.2.3.4")
            assert exc_info.value.status_code == 429
            assert exc_info.value.detail["error"] == "rate_limited"
            assert "retry_after" in exc_info.value.detail
            assert "Retry-After" in exc_info.value.headers

    def test_passes_when_allowed(self):
        redis = MagicMock()
        mock_result = MagicMock()
        mock_result.allowed = True

        with patch("app.ratelimit.limiter._build_limiters") as mock_build:
            mock_limiter = MagicMock()
            mock_limiter.limit.return_value = mock_result
            mock_build.return_value = (mock_limiter, mock_limiter)

            check_rate_limit(redis, "user_123", "1.2.3.4")  # should not raise

    def test_anon_uses_ip_as_identifier(self):
        redis = MagicMock()
        mock_result = MagicMock()
        mock_result.allowed = True

        with patch("app.ratelimit.limiter._build_limiters") as mock_build:
            anon_limiter = MagicMock()
            auth_limiter = MagicMock()
            anon_limiter.limit.return_value = mock_result
            mock_build.return_value = (anon_limiter, auth_limiter)

            check_rate_limit(redis, "anonymous", "1.2.3.4")
            anon_limiter.limit.assert_called_once_with("1.2.3.4")
            auth_limiter.limit.assert_not_called()

    def test_auth_uses_user_id_as_identifier(self):
        redis = MagicMock()
        mock_result = MagicMock()
        mock_result.allowed = True

        with patch("app.ratelimit.limiter._build_limiters") as mock_build:
            anon_limiter = MagicMock()
            auth_limiter = MagicMock()
            auth_limiter.limit.return_value = mock_result
            mock_build.return_value = (anon_limiter, auth_limiter)

            check_rate_limit(redis, "user_abc", "1.2.3.4")
            auth_limiter.limit.assert_called_once_with("user_abc")
            anon_limiter.limit.assert_not_called()


class TestGetUsage:
    def test_returns_zeros_when_redis_is_none(self):
        result = get_usage(None, "user_123", "1.2.3.4")
        assert result == {"used": 0, "limit": 0, "reset": 0}

    def test_returns_usage_info(self):
        redis = MagicMock()
        with patch("app.ratelimit.limiter._build_limiters") as mock_build:
            mock_limiter = MagicMock()
            mock_limiter.get_remaining.return_value = 1
            mock_limiter.get_reset.return_value = 1000000
            mock_build.return_value = (mock_limiter, mock_limiter)

            result = get_usage(redis, "user_123", "1.2.3.4")
            assert result["used"] == 2  # 3 - 1
            assert result["limit"] == 3
            assert result["reset"] == 1000000
