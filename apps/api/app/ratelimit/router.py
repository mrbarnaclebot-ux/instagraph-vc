from fastapi import APIRouter, Depends, Request

from app.dependencies import get_optional_user, get_redis_client
from app.ratelimit.limiter import get_usage

router = APIRouter(prefix="/api", tags=["ratelimit"])


@router.get("/usage")
async def usage(
    request: Request,
    current_user: dict | None = Depends(get_optional_user),
    redis=Depends(get_redis_client),
):
    user_id = current_user.get("sub", "anonymous") if current_user else "anonymous"
    ip = request.client.host if request.client else "127.0.0.1"
    return get_usage(redis, user_id, ip)
