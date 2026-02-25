# Phase 1: Backend Foundation - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

FastAPI service that accepts text or URL input, scrapes safely, extracts crypto VC entities via GPT-4o, persists graphs to Neo4j, and is free of the SSRF, Cypher injection, and JWT vulnerabilities inherited from the existing Flask codebase. This is the full API backend — no frontend work in this phase.

</domain>

<decisions>
## Implementation Decisions

### API Response Contract
- Success shape: `{ graph: { nodes: [...], edges: [...] }, meta: { session_id, token_count, source_type, processing_ms } }`
- All four meta fields included: session_id (for Phase 3 persistence), token_count, source_type ("url" or "text"), processing_ms
- Error shape across all endpoints: `{ error: string, message: string }` — machine-readable code + human message
- Upstream failures (OpenAI down, Neo4j unreachable): 503 with `{ error: "service_unavailable", message: "..." }` — distinct from 500 unexpected crashes

### Entity Deduplication
- Within a request: GPT-4o handles deduplication via system prompt — each unique entity appears once in the response
- Across requests: separate nodes per request — each generation is a self-contained graph (no global MERGE on entity name)
- Graph scoping: every node and relationship gets a `session_id` UUID property for query isolation
- Ambiguous entity types: trust GPT-4o's classification — the system prompt defines the 5 types clearly; no post-processing override

### Scraper Robustness
- Content extraction: `<p>` + `<article>` + h1/h2/h3 headings via requests + BeautifulSoup — no JS rendering
- Low content yield / paywalled pages: detect <500 chars after extraction, return 400 `{ error: "scrape_failed", message: "Couldn't read that URL — try pasting the text instead" }`
- Timeout: 10s, no retry — fail fast; user can resubmit
- User-Agent: spoof a realistic Chrome User-Agent to pass basic bot detection on news sites (TechCrunch, Coindesk, The Block)

### Migration Scope
- Full rewrite — start fresh with FastAPI; existing KnowledgeGraph Pydantic model structure inspires new schema but is not copied
- OpenAI native structured outputs (`response_format` with JSON schema) — drop `instructor` dependency
- Neo4j only — drop the Driver abstraction and FalkorDB support; build directly against `neo4j-driver`
- FastAPI app lives at `apps/api/` (per INFRA-01 monorepo structure)

### Claude's Discretion
- Internal FastAPI app structure (router/service/model file organization within `apps/api/`)
- Exact GPT-4o system prompt wording (beyond the entity/relationship schema specified in AI-01)
- Neo4j indexes and constraints for performance
- docker-compose service configuration details
- Python package manager choice for `apps/api/`

</decisions>

<specifics>
## Specific Ideas

- No specific references or "I want it like X" moments — open to standard FastAPI patterns for service organization

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-backend-foundation*
*Context gathered: 2026-02-25*
