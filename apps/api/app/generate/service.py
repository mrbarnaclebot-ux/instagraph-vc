import logging
import time
import uuid
from urllib.parse import urlparse
from datetime import datetime
from openai import OpenAI

from app.config import settings
from app.generate.schemas import VCKnowledgeGraph
from app.generate.prompts import SYSTEM_PROMPT
from app.scraper.scraper import scrape_url
from app.scraper.ssrf import validate_input_length
from app.graph.repository import persist_graph
from app.ratelimit.cache import get_cached_scrape, cache_scrape

logger = logging.getLogger(__name__)

# OpenAI client — module-level singleton (one instance per worker process)
_openai_client: OpenAI | None = None


def _get_openai_client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=settings.openai_api_key)
    return _openai_client


def _is_url(text: str) -> bool:
    """Check if input looks like a URL (http or https)."""
    stripped = text.strip()
    return stripped.startswith("https://") or stripped.startswith("http://")


def _auto_title(raw_input: str) -> str:
    """
    Generate a display title for a graph (CONTEXT.md: Graph naming locked decision).
    - URL inputs: "domain.com · Feb 27"
    - Text inputs: first 60 chars, truncated with ellipsis if longer
    """
    if _is_url(raw_input):
        domain = urlparse(raw_input.strip()).netloc.removeprefix("www.")
        date_str = datetime.now().strftime("%b %-d")  # e.g. "Feb 27"
        return f"{domain} · {date_str}"
    else:
        text = raw_input.strip()
        return (text[:60] + "...") if len(text) > 60 else text


async def run_generate_pipeline(
    raw_input: str,
    driver,
    user_id: str = "anonymous",    # AI-05: graph ownership
    supabase=None,                  # AUTH-03/04: pass app.state.supabase or None
    redis=None,                     # RATE-03: URL scrape cache
    openai_api_key: str | None = None,  # BYOK: user-provided OpenAI key
    force_refresh: bool = False,    # CONTEXT.md: bypass URL cache
) -> dict:
    """
    Full generate pipeline (AI-01, AI-02, AI-03, AI-04, AI-05).
    Now accepts user_id for graph ownership and supabase for metadata persistence.

    1. Validate input length (>=200 chars) via validate_input_length()
    2. Detect source type: URL (starts with http(s)://) or raw text
    3. If URL: scrape via scrape_url() (includes SSRF guard from Plan 02/03)
    4. Call GPT-4o via native structured outputs -> VCKnowledgeGraph
    5. Persist to Neo4j via persist_graph() with session_id + user_id (AI-05)
    6. AUTH-03: Save graph metadata to Supabase graphs table (authenticated only)
    7. Return API response matching CONTEXT.md contract
    """
    start_ms = int(time.time() * 1000)

    session_id = str(uuid.uuid4())

    cache_hit = False
    cache_age_seconds = None

    if _is_url(raw_input):
        source_type = "url"
        # RATE-03: Check URL cache before scraping (Phase 4)
        if not force_refresh:
            cached_text, cache_age = get_cached_scrape(redis, raw_input.strip())
            if cached_text is not None:
                content = cached_text
                cache_hit = True
                cache_age_seconds = cache_age
        if not cache_hit:
            content = await scrape_url(raw_input.strip())
            cache_scrape(redis, raw_input.strip(), content)
    else:
        source_type = "text"
        validate_input_length(raw_input)
        content = raw_input[:32_000]  # cap at 32k even for direct text (AI-02)

    # AI-01: GPT-4o structured extraction via native structured outputs
    # BYOK: if user provides their own key, use a transient client (never stored/logged)
    if openai_api_key:
        client = OpenAI(api_key=openai_api_key)
    else:
        client = _get_openai_client()
    try:
        response = client.beta.chat.completions.parse(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": content},
            ],
            response_format=VCKnowledgeGraph,
        )
    except Exception as e:
        from fastapi import HTTPException
        from openai import RateLimitError, AuthenticationError, APIStatusError
        if isinstance(e, RateLimitError):
            raise HTTPException(status_code=429, detail={
                "error": "rate_limited",
                "message": "Too many requests — please try again in a moment",
            })
        if isinstance(e, AuthenticationError):
            raise HTTPException(status_code=503, detail={
                "error": "service_unavailable",
                "message": "AI service configuration error — please try again later",
            })
        if isinstance(e, APIStatusError) and e.status_code == 400:
            raise HTTPException(status_code=400, detail={
                "error": "invalid_request",
                "message": "Input could not be processed — try shortening or rephrasing it",
            })
        raise HTTPException(status_code=503, detail={
            "error": "service_unavailable",
            "message": "AI service unavailable — please try again",
        })

    parsed: VCKnowledgeGraph = response.choices[0].message.parsed
    token_count: int = response.usage.total_tokens

    # Serialize to dicts for Neo4j persistence and response
    nodes = [node.model_dump(exclude_none=True) for node in parsed.nodes]
    edges = [edge.model_dump() for edge in parsed.edges]

    # Persist to Neo4j with ownership (AI-05) — parameterized Cypher only (SEC-02)
    try:
        persist_graph(driver, session_id=session_id, nodes=nodes, edges=edges, user_id=user_id)
    except Exception:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail={
            "error": "service_unavailable",
            "message": "Graph database unavailable — please try again",
        })

    # AUTH-03: Save graph metadata to Supabase (authenticated users only)
    # Fire-and-forget — Supabase failure must never block the API response
    if supabase is not None and user_id != "anonymous":
        title = _auto_title(raw_input)
        try:
            supabase.table("graphs").insert({
                "user_id": user_id,
                "title": title,
                "source_url": raw_input.strip() if _is_url(raw_input) else None,
                "node_count": len(nodes),
                "edge_count": len(edges),
                "neo4j_session_id": session_id,
            }).execute()
        except Exception:
            logger.warning("Failed to save graph metadata to Supabase", exc_info=True)

    processing_ms = int(time.time() * 1000) - start_ms

    return {
        "graph": {"nodes": nodes, "edges": edges},
        "meta": {
            "session_id": session_id,
            "token_count": token_count,
            "source_type": source_type,
            "processing_ms": processing_ms,
            "cache_hit": cache_hit,
            "cache_age_seconds": cache_age_seconds,
        },
    }
