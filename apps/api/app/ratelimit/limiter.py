import time

from fastapi import HTTPException
from upstash_ratelimit import Ratelimit, FixedWindow


def _build_limiters(redis):
    """Build anon and auth rate limiters from a Redis instance."""
    anon = Ratelimit(
        redis=redis,
        limiter=FixedWindow(max_requests=3, window=86400),
        prefix="ratelimit:anon",
    )
    auth = Ratelimit(
        redis=redis,
        limiter=FixedWindow(max_requests=3, window=86400),
        prefix="ratelimit:auth",
    )
    return anon, auth


def check_rate_limit(redis, user_id: str, ip: str) -> None:
    """Check per-user daily rate limit. Raises HTTPException(429) if exceeded.
    Skips check if Redis is not configured (dev without Upstash)."""
    if redis is None:
        return
    is_anonymous = user_id == "anonymous"
    anon_limiter, auth_limiter = _build_limiters(redis)
    limiter = anon_limiter if is_anonymous else auth_limiter
    identifier = ip if is_anonymous else user_id
    result = limiter.limit(identifier)
    if not result.allowed:
        seconds_until_reset = max(1, int(result.reset - time.time()))
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limited",
                "retry_after": seconds_until_reset,
                "message": "Daily limit reached",
            },
            headers={"Retry-After": str(seconds_until_reset)},
        )


def get_usage(redis, user_id: str, ip: str) -> dict:
    """Return usage info without consuming a request.
    Uses the ratelimit SDK's get_remaining/get_reset to peek at state."""
    if redis is None:
        return {"used": 0, "limit": 0, "reset": 0}
    is_anonymous = user_id == "anonymous"
    anon_limiter, auth_limiter = _build_limiters(redis)
    limiter = anon_limiter if is_anonymous else auth_limiter
    identifier = ip if is_anonymous else user_id
    max_requests = 3
    remaining = limiter.get_remaining(identifier)
    reset = limiter.get_reset(identifier)
    used = max_requests - remaining
    return {"used": used, "limit": max_requests, "reset": int(reset)}
