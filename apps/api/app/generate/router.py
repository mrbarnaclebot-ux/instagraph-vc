import asyncio
import logging
import time
from fastapi import APIRouter, Depends, HTTPException, Request
from neo4j import Driver

from app.dependencies import get_current_user, get_optional_user, get_neo4j_driver, get_supabase_client, get_redis_client
from app.ratelimit.limiter import check_rate_limit
from app.generate.schemas import GenerateRequest, GenerateResponse
from app.generate.service import run_generate_pipeline, _is_url
from app.graph.repository import get_graph_by_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["generate"])


@router.post("/generate", response_model=GenerateResponse)
async def generate(
    request: Request,
    body: GenerateRequest,
    current_user: dict | None = Depends(get_optional_user),
    driver: Driver = Depends(get_neo4j_driver),
    supabase=Depends(get_supabase_client),
    redis=Depends(get_redis_client),
) -> GenerateResponse:
    """
    Generate a VC knowledge graph from text or URL input (AI-01, AI-02, AI-03).
    AUTH-04: Logs every request to Supabase request_log (fire-and-forget).
    AI-05: Passes user_id for graph ownership in Neo4j.
    AUTH-03: run_generate_pipeline saves graph metadata to Supabase graphs table.
    """
    start = time.time()
    user_id = current_user.get("sub", "anonymous") if current_user else "anonymous"

    # BYOK: if user provides their own OpenAI API key, bypass rate limit (RATE-01)
    openai_key = request.headers.get("x-openai-key")
    # Validate BYOK key format to prevent rate limit bypass with junk values
    if openai_key and not openai_key.startswith("sk-"):
        openai_key = None
    if not openai_key:
        # Check per-user daily rate limit (RATE-01)
        ip = request.client.host if request.client else "127.0.0.1"
        await asyncio.to_thread(check_rate_limit, redis, user_id, ip)

    result = await run_generate_pipeline(
        raw_input=body.input,
        driver=driver,
        user_id=user_id,
        supabase=supabase,
        redis=redis,
        openai_api_key=openai_key,
        force_refresh=body.force_refresh,
    )

    processing_ms = int((time.time() - start) * 1000)

    # AUTH-04: Log request to Supabase (fire-and-forget — failure must not affect response)
    if supabase is not None:
        try:
            await asyncio.to_thread(
                lambda: supabase.table("request_log").insert({
                    "user_id": user_id,
                    "endpoint": "/api/generate",
                    "source_url": body.input.strip() if _is_url(body.input) else None,
                    "ip": request.client.host if request.client else None,
                    "status_code": 200,
                    "tokens_used": result["meta"]["token_count"],
                    "processing_ms": processing_ms,
                }).execute()
            )
        except Exception:
            logger.warning("Failed to log request to Supabase", exc_info=True)

    return result


@router.get("/generate/session/{session_id}")
async def get_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    driver: Driver = Depends(get_neo4j_driver),
) -> dict:
    """Retrieve a previously generated graph by session_id (FE-03: history reload)."""
    user_id = current_user.get("sub", "")
    graph = await asyncio.to_thread(get_graph_by_session, driver, session_id, user_id=user_id)
    if graph is None:
        raise HTTPException(status_code=404, detail={
            "error": "not_found",
            "message": "Graph not found",
        })
    return {"graph": graph, "meta": {"session_id": session_id, "token_count": 0, "source_type": "text", "processing_ms": 0}}
