import time
from fastapi import APIRouter, Depends, Request
from neo4j import Driver

from app.dependencies import get_current_user, get_neo4j_driver, get_supabase_client
from app.generate.schemas import GenerateRequest, GenerateResponse
from app.generate.service import run_generate_pipeline

router = APIRouter(prefix="/api", tags=["generate"])


@router.post("/generate", response_model=GenerateResponse)
async def generate(
    request: Request,
    body: GenerateRequest,
    current_user: dict = Depends(get_current_user),
    driver: Driver = Depends(get_neo4j_driver),
    supabase=Depends(get_supabase_client),
) -> GenerateResponse:
    """
    Generate a VC knowledge graph from text or URL input (AI-01, AI-02, AI-03).
    AUTH-04: Logs every request to Supabase request_log (fire-and-forget).
    AI-05: Passes user_id for graph ownership in Neo4j.
    AUTH-03: run_generate_pipeline saves graph metadata to Supabase graphs table.

    Authentication: Requires valid Clerk JWT Bearer token (SEC-03).
    Rejected immediately with 401 if token is missing or invalid.

    Request body: {"input": "text or https://url"}

    Returns:
    {
        "graph": {
            "nodes": [{"id": "...", "label": "...", "type": "...", "properties": {...}}],
            "edges": [{"source": "...", "target": "...", "relationship": "..."}]
        },
        "meta": {
            "session_id": "uuid",
            "token_count": 1234,
            "source_type": "url" | "text",
            "processing_ms": 4500
        }
    }
    """
    start = time.time()
    user_id = current_user.get("sub", "anonymous")

    result = run_generate_pipeline(
        raw_input=body.input,
        driver=driver,
        user_id=user_id,
        supabase=supabase,
    )

    processing_ms = int((time.time() - start) * 1000)

    # AUTH-04: Log request to Supabase (fire-and-forget — failure must not affect response)
    if supabase is not None:
        try:
            supabase.table("request_log").insert({
                "user_id": user_id,
                "endpoint": "/api/generate",
                "source_url": body.input.strip() if body.input.strip().startswith("https://") else None,
                "ip": request.client.host if request.client else None,
                "status_code": 200,
                "tokens_used": result["meta"]["token_count"],
                "processing_ms": processing_ms,
            }).execute()
        except Exception:
            pass  # Fire-and-forget

    return result
