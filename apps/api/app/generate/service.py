import time
import uuid
from openai import OpenAI

from app.config import settings
from app.generate.schemas import VCKnowledgeGraph
from app.generate.prompts import SYSTEM_PROMPT
from app.scraper.scraper import scrape_url
from app.scraper.ssrf import validate_input_length
from app.graph.repository import persist_graph

# OpenAI client — module-level singleton (one instance per worker process)
_openai_client: OpenAI | None = None


def _get_openai_client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=settings.openai_api_key)
    return _openai_client


def run_generate_pipeline(
    raw_input: str,
    driver,
) -> dict:
    """
    Full generate pipeline (AI-01, AI-02, AI-03, AI-04):
    1. Validate input length (>=200 chars) via validate_input_length()
    2. Detect source type: URL (starts with https://) or raw text
    3. If URL: scrape via scrape_url() (includes SSRF guard from Plan 02/03)
    4. Call GPT-4o via native structured outputs -> VCKnowledgeGraph
    5. Persist to Neo4j via persist_graph() with session_id
    6. Return API response matching CONTEXT.md contract

    Returns dict matching GenerateResponse schema:
    {
        "graph": {"nodes": [...], "edges": [...]},
        "meta": {"session_id": ..., "token_count": ..., "source_type": ..., "processing_ms": ...}
    }
    """
    start_ms = int(time.time() * 1000)

    # AI-03: Source type detection
    # URL inputs: starts with "https://" (HTTP is blocked by SSRF validator anyway)
    # Text inputs: everything else
    session_id = str(uuid.uuid4())

    if raw_input.strip().startswith("https://"):
        source_type = "url"
        # For URL inputs, length check is skipped — the URL itself is short but the
        # scraped content will be validated by scrape_url() (>500 char minimum yield).
        content = scrape_url(raw_input.strip())
    else:
        source_type = "text"
        # AI-04: Reject text inputs shorter than 200 characters.
        # validate_input_length raises HTTPException(400) with exact required message.
        # Applied to text inputs only — URL inputs have their own content yield check.
        validate_input_length(raw_input)
        content = raw_input[:32_000]  # cap at 32k even for direct text (AI-02)

    # AI-01: GPT-4o structured extraction via native structured outputs
    # client.beta.chat.completions.parse() guarantees VCKnowledgeGraph schema
    # No manual JSON repair needed — native structured outputs handles it
    client = _get_openai_client()
    try:
        response = client.beta.chat.completions.parse(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": content},
            ],
            response_format=VCKnowledgeGraph,
        )
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail={
            "error": "service_unavailable",
            "message": "OpenAI service unavailable — please try again",
        })

    parsed: VCKnowledgeGraph = response.choices[0].message.parsed
    token_count: int = response.usage.total_tokens

    # Serialize to dicts for Neo4j persistence and response
    # exclude_none strips unpopulated NodeProperties fields (keeps Neo4j/frontend clean)
    nodes = [node.model_dump(exclude_none=True) for node in parsed.nodes]
    edges = [edge.model_dump() for edge in parsed.edges]

    # Persist to Neo4j — parameterized Cypher only (SEC-02, from Plan 03)
    try:
        persist_graph(driver, session_id=session_id, nodes=nodes, edges=edges)
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail={
            "error": "service_unavailable",
            "message": "Graph database unavailable — please try again",
        })

    processing_ms = int(time.time() * 1000) - start_ms

    return {
        "graph": {"nodes": nodes, "edges": edges},
        "meta": {
            "session_id": session_id,
            "token_count": token_count,
            "source_type": source_type,
            "processing_ms": processing_ms,
        },
    }
