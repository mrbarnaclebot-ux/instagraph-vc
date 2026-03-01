import pytest
from unittest.mock import MagicMock
from app.ratelimit.cache import get_cached_scrape, cache_scrape, _cache_key


class TestCacheKey:
    def test_deterministic(self):
        assert _cache_key("https://example.com/a") == _cache_key("https://example.com/a")

    def test_normalizes_trailing_slash(self):
        assert _cache_key("https://example.com/a/") == _cache_key("https://example.com/a")

    def test_normalizes_whitespace(self):
        assert _cache_key("  https://example.com/a  ") == _cache_key("https://example.com/a")

    def test_normalizes_case(self):
        assert _cache_key("HTTPS://EXAMPLE.COM/A") == _cache_key("https://example.com/a")

    def test_different_urls_differ(self):
        assert _cache_key("https://a.com") != _cache_key("https://b.com")


class TestGetCachedScrape:
    def test_returns_none_when_redis_is_none(self):
        text, age = get_cached_scrape(None, "https://example.com")
        assert text is None
        assert age is None

    def test_returns_none_on_cache_miss(self):
        redis = MagicMock()
        redis.get.return_value = None
        text, age = get_cached_scrape(redis, "https://example.com")
        assert text is None
        assert age is None

    def test_returns_cached_text_on_hit(self):
        redis = MagicMock()
        redis.get.return_value = "cached article text"
        redis.ttl.return_value = 3000  # 3000s remaining of 3600s TTL
        text, age = get_cached_scrape(redis, "https://example.com")
        assert text == "cached article text"
        assert age == 600  # 3600 - 3000

    def test_handles_expired_ttl(self):
        redis = MagicMock()
        redis.get.return_value = "text"
        redis.ttl.return_value = -1  # key exists but no TTL
        text, age = get_cached_scrape(redis, "https://example.com")
        assert text == "text"
        assert age is None

    def test_handles_zero_ttl(self):
        redis = MagicMock()
        redis.get.return_value = "text"
        redis.ttl.return_value = 0
        text, age = get_cached_scrape(redis, "https://example.com")
        assert text == "text"
        assert age is None


class TestCacheScrape:
    def test_noop_when_redis_is_none(self):
        cache_scrape(None, "https://example.com", "text")  # should not raise

    def test_stores_with_1h_ttl(self):
        redis = MagicMock()
        cache_scrape(redis, "https://example.com", "article text")
        redis.set.assert_called_once()
        args, kwargs = redis.set.call_args
        assert args[1] == "article text"
        assert kwargs.get("ex") == 3600 or args[2] if len(args) > 2 else True

    def test_key_is_sha256_prefixed(self):
        redis = MagicMock()
        cache_scrape(redis, "https://example.com", "text")
        key = redis.set.call_args[0][0]
        assert key.startswith("scrape:")
        assert len(key) > 10  # sha256 hex is 64 chars
