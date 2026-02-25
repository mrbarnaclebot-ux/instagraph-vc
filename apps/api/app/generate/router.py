from fastapi import APIRouter, Depends
from neo4j import Driver

from app.dependencies import get_current_user, get_neo4j_driver
from app.generate.schemas import GenerateRequest, GenerateResponse
from app.generate.service import run_generate_pipeline

router = APIRouter(prefix="/api", tags=["generate"])


@router.post("/generate", response_model=GenerateResponse)
async def generate(
    body: GenerateRequest,
    current_user: dict = Depends(get_current_user),
    driver: Driver = Depends(get_neo4j_driver),
) -> GenerateResponse:
    """
    Generate a VC knowledge graph from text or URL input (AI-01, AI-02, AI-03).

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
    result = run_generate_pipeline(raw_input=body.input, driver=driver)
    return result
