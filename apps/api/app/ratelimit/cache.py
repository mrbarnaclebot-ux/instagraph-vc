import hashlib


def _cache_key(url: str) -> str:
    normalized = url.strip().lower().rstrip("/")
    url_hash = hashlib.sha256(normalized.encode()).hexdigest()
    return f"scrape:{url_hash}"


def get_cached_scrape(redis, url: str) -> tuple[str | None, int | None]:
    """Returns (cached_text, seconds_ago) or (None, None)."""
    if redis is None:
        return None, None
    key = _cache_key(url)
    text = redis.get(key)
    if text is None:
        return None, None
    ttl = redis.ttl(key)
    seconds_ago = 3600 - ttl if ttl and ttl > 0 else None
    return text, seconds_ago


def cache_scrape(redis, url: str, text: str) -> None:
    """Store scraped text with 1-hour TTL."""
    if redis is None:
        return
    key = _cache_key(url)
    redis.set(key, text, ex=3600)
