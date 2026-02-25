# Phase 1: Backend Foundation - Research

**Researched:** 2026-02-25
**Domain:** FastAPI, OpenAI structured outputs, Neo4j driver, SSRF hardening, Clerk JWT auth
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**API Response Contract**
- Success shape: `{ graph: { nodes: [...], edges: [...] }, meta: { session_id, token_count, source_type, processing_ms } }`
- All four meta fields included: session_id (for Phase 3 persistence), token_count, source_type ("url" or "text"), processing_ms
- Error shape across all endpoints: `{ error: string, message: string }` — machine-readable code + human message
- Upstream failures (OpenAI down, Neo4j unreachable): 503 with `{ error: "service_unavailable", message: "..." }` — distinct from 500 unexpected crashes

**Entity Deduplication**
- Within a request: GPT-4o handles deduplication via system prompt — each unique entity appears once in the response
- Across requests: separate nodes per request — each generation is a self-contained graph (no global MERGE on entity name)
- Graph scoping: every node and relationship gets a `session_id` UUID property for query isolation
- Ambiguous entity types: trust GPT-4o's classification — the system prompt defines the 5 types clearly; no post-processing override

**Scraper Robustness**
- Content extraction: `<p>` + `<article>` + h1/h2/h3 headings via requests + BeautifulSoup — no JS rendering
- Low content yield / paywalled pages: detect <500 chars after extraction, return 400 `{ error: "scrape_failed", message: "Couldn't read that URL — try pasting the text instead" }`
- Timeout: 10s, no retry — fail fast; user can resubmit
- User-Agent: spoof a realistic Chrome User-Agent to pass basic bot detection on news sites (TechCrunch, Coindesk, The Block)

**Migration Scope**
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

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Scaffold monorepo with `apps/web/` (Next.js 15) and `apps/api/` (FastAPI) sharing `packages/shared-types/` via Turborepo | Turborepo + uv for apps/api/ directory structure documented |
| INFRA-02 | `docker-compose up` starts Neo4j and Redis; frontend and backend connect via `.env.local` | Neo4j 5.x docker-compose with cypher-shell healthcheck pattern documented |
| SEC-01 | Validate every inbound URL against private IP ranges (RFC 1918, loopback, link-local), enforce HTTPS-only, reject blocked domains before any outbound HTTP request | SSRF: resolve-once-pin-IP pattern with ipaddress stdlib; DNS rebinding protection documented |
| SEC-02 | All Neo4j queries use parameterised Cypher (driver parameter objects) — zero string interpolation | neo4j-driver 5.x `execute_query($param)` pattern documented; existing codebase uses `.format()` which must be eliminated |
| SEC-03 | Every protected endpoint validates Clerk JWT Bearer token — verifying signature via JWKS, `azp` claim, and expiry — before any business logic | clerk-backend-api SDK + PyJWT/PyJWKClient fallback pattern documented |
| SEC-04 | Single Neo4j driver instance at startup (singleton), reused across requests, closed gracefully on shutdown — no per-request driver instantiation | FastAPI lifespan + app.state singleton pattern documented |
| AI-01 | Generate structured knowledge graph from input using GPT-4o with VC-specific system prompt — extracting 5 entity types with 8 typed relationships and entity properties | OpenAI `client.beta.chat.completions.parse()` with Pydantic BaseModel documented |
| AI-02 | Scrape public HTTPS URL, strip boilerplate HTML via BeautifulSoup, cap content at 32,000 chars, cache raw scraped text in Redis for 1 hour | BeautifulSoup p+article+heading selector pattern documented; Redis caching in Phase 4 (RATE-03) |
| AI-03 | User can paste raw text directly — bypasses scraping, goes straight to GPT-4o | Source type detection via `source_type` meta field; skip scraper if no URL prefix |
| AI-04 | Reject inputs shorter than 200 characters with 400 and specific message | FastAPI request validation with HTTPException 400 |
</phase_requirements>

---

## Summary

Phase 1 is a full rewrite of the existing Flask/instructor/FalkorDB app into a FastAPI service at `apps/api/`. The core pattern is: receive text or URL input, optionally scrape (with SSRF protection), call GPT-4o via native structured outputs, persist the resulting graph to Neo4j, and return a typed JSON response. Three inherited vulnerabilities must be fixed: SSRF (no URL validation in existing scraper), Cypher injection (existing `neo4j.py` uses `.format()` for SKIP/LIMIT — line 71-77), and JWT auth (does not exist at all in the current codebase).

The existing Flask codebase is reference material only. The new FastAPI service uses uv as the package manager, the lifespan context manager pattern for Neo4j driver singleton, the `client.beta.chat.completions.parse()` API for structured GPT-4o output, and a resolve-once-pin-IP scraper for SSRF hardening. Redis caching of scraped content is specified in AI-02 but that requirement is delivered as part of Phase 4 (RATE-03 covers it) — Phase 1 scrapes fresh each time.

The most nuanced area is SSRF protection: a naive "check the IP before requesting" approach is vulnerable to DNS rebinding (the DNS answer changes between validation and connection). The correct pattern is to resolve the hostname once, validate the IP, then reuse that IP for the actual TCP connection while preserving the original hostname in the Host header for TLS certificate validation.

**Primary recommendation:** Build apps/api/ with uv + FastAPI 0.115.x, neo4j 5.28.3, openai SDK 1.x, PyJWT 2.11 for Clerk verification, requests + BeautifulSoup4 for scraping — all wired together via FastAPI's lifespan, dependency injection, and domain-based router/service structure.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fastapi | 0.115.x | HTTP framework with automatic OpenAPI, Pydantic validation | Chosen by project — async, typed, production-grade |
| uvicorn | 0.34.x | ASGI server | Standard ASGI server for FastAPI in production |
| pydantic | 2.x (bundled with FastAPI) | Request/response models, GPT-4o output schemas | Required by FastAPI; v2 is significantly faster than v1 |
| openai | 1.x (>=1.40 for structured outputs) | GPT-4o API client with native structured outputs | Official SDK; `client.beta.chat.completions.parse()` introduced in 1.40 |
| neo4j | 5.28.3 | Official Neo4j Bolt driver for Python | Project decision: stay on 5.x; v6 has breaking changes (explicit `.close()`, dropped Python 3.9, changed error types) |
| requests | 2.32.x | HTTP client for URL scraping | Stable, supports custom Transport adapters needed for DNS rebinding fix |
| beautifulsoup4 | 4.13.x | HTML parsing for scraper | Project decision; handles malformed HTML gracefully |
| lxml | 5.x | Fast HTML parser backend for BeautifulSoup | Significantly faster than html.parser for large news articles |
| PyJWT | 2.11.x | JWT decode and verification | Handles RS256 JWKS-based verification for Clerk tokens |
| cryptography | 42.x | RSA key support for PyJWT | Required by PyJWT for RS256 algorithm |
| python-dotenv | 1.x | `.env` loading for local dev | Standard for FastAPI dev environments |
| uv | latest | Package manager and virtual env | Project discretion: 10-100x faster than pip/Poetry; official FastAPI docs endorse it; pyproject.toml-native |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fastapi-clerk-auth | 0.0.9 | Thin Clerk JWT middleware | Convenience wrapper; use if it correctly validates azp + expiry; fall back to manual PyJWT if not |
| clerk-backend-api | latest | Official Clerk Python SDK | Alternative to manual verification — `sdk.authenticate_request()` handles JWKS + azp + expiry |
| httpx | 0.28.x | Async HTTP client | If any endpoint needs async outbound calls; requests is sync and fine for scraper given 10s timeout |
| pytest | 8.x | Test framework | Unit tests for SSRF validator, Cypher parameterization, input validation |
| pytest-asyncio | 0.24.x | Async test support | Required for testing async FastAPI endpoints |
| httpx | 0.28.x | Test client for FastAPI | `httpx.AsyncClient` is FastAPI's recommended test client |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| neo4j 5.28.3 | neo4j 6.1.0 | v6 released Sep 2025; breaking changes include explicit `.close()` required, changed error class hierarchy, dropped Python 3.9 support. Project STATE.md explicitly decided on 5.28.3 |
| PyJWT + PyJWKClient | clerk-backend-api SDK | SDK is the official path but requires `httpx.Request` objects; PyJWT gives more control over claim validation and is framework-agnostic |
| requests (scraper) | httpx | requests has a richer ecosystem of transport adapters; the DNS-rebinding fix requires `HTTPAdapter.init_poolmanager()` which requests supports natively |
| uv | poetry | Both manage pyproject.toml; uv is 10-100x faster for CI and significantly simpler Dockerfile; uv has official FastAPI integration guide |

**Installation:**
```bash
# In apps/api/
uv init --app
uv add "fastapi[standard]" "openai>=1.40" "neo4j==5.28.3" requests beautifulsoup4 lxml PyJWT cryptography python-dotenv
uv add --dev pytest pytest-asyncio httpx
```

---

## Architecture Patterns

### Recommended Project Structure
```
apps/api/
├── pyproject.toml           # uv-managed dependencies
├── uv.lock                  # lockfile — commit to git
├── .env.example             # document required env vars
├── Dockerfile               # production image using uv
├── app/
│   ├── main.py              # FastAPI app instantiation + lifespan
│   ├── config.py            # Pydantic BaseSettings (env var loading)
│   ├── dependencies.py      # shared deps: get_neo4j_driver, get_current_user
│   ├── generate/            # domain: AI graph generation
│   │   ├── router.py        # POST /api/generate endpoint
│   │   ├── service.py       # orchestrates scraper + GPT-4o + Neo4j
│   │   ├── schemas.py       # GenerateRequest, GenerateResponse, GraphNode, GraphEdge
│   │   └── prompts.py       # GPT-4o system prompt constant
│   ├── scraper/             # domain: URL scraping
│   │   ├── scraper.py       # SSRF-hardened fetch + BeautifulSoup extraction
│   │   └── ssrf.py          # IP validation, DNS rebinding protection
│   ├── graph/               # domain: Neo4j persistence
│   │   └── repository.py    # parameterized Cypher queries
│   └── auth/                # domain: JWT verification
│       └── clerk.py         # Clerk JWT dependency
└── tests/
    ├── conftest.py           # shared fixtures, test Neo4j driver mock
    ├── test_ssrf.py          # SSRF validation unit tests
    ├── test_generate.py      # /api/generate endpoint tests
    └── test_scraper.py       # BeautifulSoup extraction tests
```

### Pattern 1: FastAPI Lifespan for Neo4j Singleton (SEC-04)
**What:** Create a single driver at app startup using `asynccontextmanager`, store in `app.state`, close on shutdown.
**When to use:** Always — never instantiate the driver inside a route handler or dependency.
**Example:**
```python
# Source: https://fastapi.tiangolo.com/advanced/events/ (verified)
# apps/api/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from neo4j import GraphDatabase
from app.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create driver singleton
    app.state.neo4j_driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_username, settings.neo4j_password),
    )
    app.state.neo4j_driver.verify_connectivity()
    yield
    # Shutdown: close driver (required in neo4j 5.x and mandatory in 6.x)
    app.state.neo4j_driver.close()

app = FastAPI(lifespan=lifespan)
```

**Dependency injection to expose the driver:**
```python
# apps/api/app/dependencies.py
from fastapi import Depends, Request
from neo4j import Driver

def get_neo4j_driver(request: Request) -> Driver:
    return request.app.state.neo4j_driver
```

### Pattern 2: OpenAI Native Structured Outputs (AI-01)
**What:** Use `client.beta.chat.completions.parse()` with a Pydantic model as `response_format`. The model guarantees the JSON shape — no manual parsing or error correction needed.
**When to use:** Always for GPT-4o structured extraction — this replaces `instructor`.
**Example:**
```python
# Source: OpenAI structured outputs docs (verified via WebSearch + multiple community sources)
# apps/api/app/generate/service.py
from openai import OpenAI
from app.generate.schemas import VCKnowledgeGraph

client = OpenAI()

def extract_graph(text: str) -> tuple[VCKnowledgeGraph, int]:
    response = client.beta.chat.completions.parse(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text[:32000]},  # cap per AI-02
        ],
        response_format=VCKnowledgeGraph,
    )
    parsed = response.choices[0].message.parsed
    token_count = response.usage.total_tokens
    return parsed, token_count
```

**Token count** is available at `response.usage.total_tokens` — this populates `meta.token_count` in the response.

### Pattern 3: SSRF-Hardened Scraper — Resolve Once, Pin IP (SEC-01)
**What:** Resolve the hostname to an IP before making any request. Validate the IP against blocklist. Then make the actual HTTP request to the IP directly (preventing DNS rebinding), while preserving the original hostname in the Host header and SNI for TLS.
**When to use:** Every URL-based scrape request.
**Example:**
```python
# Source: https://joshua.hu/solving-fixing-interesting-problems-python-dns-rebindind-requests (verified)
# apps/api/app/scraper/ssrf.py
import ipaddress
import socket
from urllib.parse import urlparse
from fastapi import HTTPException

BLOCKED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),   # link-local / AWS metadata
    ipaddress.ip_network("::1/128"),           # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),          # IPv6 ULA
]

def validate_url(url: str) -> str:
    """Validates URL and returns the hostname for IP pinning."""
    parsed = urlparse(url)

    # Enforce HTTPS only (SEC-01)
    if parsed.scheme != "https":
        raise HTTPException(status_code=400, detail={
            "error": "invalid_url",
            "message": "Only HTTPS URLs are accepted"
        })

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail={
            "error": "invalid_url",
            "message": "Could not parse hostname from URL"
        })

    # Resolve once — validates before connecting (DNS rebinding protection)
    try:
        resolved_ip = socket.gethostbyname(hostname)
    except socket.gaierror:
        raise HTTPException(status_code=400, detail={
            "error": "invalid_url",
            "message": "Could not resolve hostname"
        })

    ip_obj = ipaddress.ip_address(resolved_ip)

    # Block private/loopback/link-local ranges
    for network in BLOCKED_NETWORKS:
        if ip_obj in network:
            raise HTTPException(status_code=400, detail={
                "error": "invalid_url",
                "message": "URL resolves to a blocked address"
            })

    # Also block non-global addresses (covers edge cases)
    if not ip_obj.is_global:
        raise HTTPException(status_code=400, detail={
            "error": "invalid_url",
            "message": "URL resolves to a non-public address"
        })

    return url  # Caller uses requests with allow_redirects=False + custom adapter
```

**Important:** After `validate_url()`, the actual `requests.get()` call must also set `allow_redirects=False` — redirect targets must be validated through `validate_url()` before following. This is a common bypass vector.

### Pattern 4: Parameterized Neo4j Cypher (SEC-02)
**What:** Use `$param` syntax with keyword arguments or a dict. Never format strings.
**When to use:** Every single Cypher query — no exceptions.
**Example:**
```python
# Source: https://neo4j.com/docs/python-manual/current/ (verified)
# apps/api/app/graph/repository.py

def persist_graph(driver, session_id: str, nodes: list, edges: list) -> None:
    with driver.session() as session:
        # CORRECT: parameterized
        session.run(
            """
            UNWIND $nodes AS node
            CREATE (n:Entity {
                id: node.id,
                label: node.label,
                type: node.type,
                session_id: $session_id
            })
            """,
            nodes=nodes,
            session_id=session_id,
        )
        session.run(
            """
            UNWIND $edges AS edge
            MATCH (s:Entity {id: edge.source, session_id: $session_id})
            MATCH (t:Entity {id: edge.target, session_id: $session_id})
            CREATE (s)-[r:RELATIONSHIP {
                type: edge.relationship,
                session_id: $session_id
            }]->(t)
            """,
            edges=edges,
            session_id=session_id,
        )

# WRONG (existing codebase — never do this):
# "SKIP {skip} LIMIT {per_page}".format(skip=skip, per_page=per_page)
```

**Note:** The existing `drivers/neo4j.py` at line 71-77 uses `.format()` for SKIP/LIMIT — this is the Cypher injection vulnerability that must not be carried forward.

### Pattern 5: Clerk JWT Verification (SEC-03)
**What:** Use the official `clerk-backend-api` SDK for JWT verification, or fall back to manual PyJWT + PyJWKClient. The clerk-backend-api SDK is the simpler path; PyJWT is the fallback when SDK compatibility is uncertain.
**When to use:** As a FastAPI dependency on every protected route.

**Option A — Official Clerk SDK (recommended):**
```python
# Source: https://github.com/clerk/clerk-sdk-python/blob/main/README.md (verified)
# apps/api/app/auth/clerk.py
import os
from fastapi import Depends, HTTPException, Request
from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions

_clerk_sdk = Clerk(bearer_auth=os.environ["CLERK_SECRET_KEY"])

async def get_current_user(request: Request) -> dict:
    try:
        state = _clerk_sdk.authenticate_request(
            request,
            AuthenticateRequestOptions(
                authorized_parties=[os.environ["CLERK_AUTHORIZED_PARTY"]]
            )
        )
        if not state.is_signed_in:
            raise HTTPException(status_code=401, detail={
                "error": "unauthorized",
                "message": "Invalid or missing token"
            })
        return state.payload
    except Exception:
        raise HTTPException(status_code=401, detail={
            "error": "unauthorized",
            "message": "Token verification failed"
        })
```

**Option B — Manual PyJWT fallback (if SDK fails):**
```python
# Source: https://clerk.com/docs/guides/sessions/manual-jwt-verification (verified)
# + https://pyjwt.readthedocs.io/en/latest/ (verified)
import jwt
from jwt import PyJWKClient

JWKS_URL = f"https://{os.environ['CLERK_FRONTEND_API']}/.well-known/jwks.json"
_jwks_client = PyJWKClient(JWKS_URL)

async def get_current_user(token: str = Depends(HTTPBearer())) -> dict:
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token.credentials)
        payload = jwt.decode(
            token.credentials,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_exp": True},
        )
        # Validate azp claim
        azp = payload.get("azp", "")
        allowed = os.environ.get("CLERK_AUTHORIZED_PARTY", "").split(",")
        if azp and azp not in allowed:
            raise jwt.InvalidClaimError("azp")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail={"error": "unauthorized", "message": "Token expired"})
    except Exception:
        raise HTTPException(status_code=401, detail={"error": "unauthorized", "message": "Invalid token"})
```

**STATE.md warning:** `fastapi-clerk-auth` v0.0.9 is a low-activity library. Prefer `clerk-backend-api` (official) or manual PyJWT.

### Pattern 6: BeautifulSoup Content Extraction (AI-02)
**What:** Extract text from `<p>`, `<article>`, and h1/h2/h3 headings. Use lxml parser for speed.
**When to use:** Every URL scrape after SSRF validation passes.
**Example:**
```python
# Source: https://www.crummy.com/software/BeautifulSoup/bs4/doc/ (verified via WebSearch)
# apps/api/app/scraper/scraper.py
import requests
from bs4 import BeautifulSoup

CHROME_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

def scrape_url(url: str) -> str:
    """Returns extracted text or raises HTTPException."""
    response = requests.get(
        url,
        headers={"User-Agent": CHROME_UA},
        timeout=10,
        allow_redirects=False,  # validate redirects manually
    )
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")

    # Remove script/style noise
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    parts = []
    # Headings provide structure
    for heading in soup.find_all(["h1", "h2", "h3"]):
        parts.append(heading.get_text(strip=True))
    # Article body
    for article in soup.find_all("article"):
        parts.append(article.get_text(separator=" ", strip=True))
    # Paragraph fallback
    for p in soup.find_all("p"):
        parts.append(p.get_text(strip=True))

    text = " ".join(parts)

    if len(text) < 500:
        raise HTTPException(status_code=400, detail={
            "error": "scrape_failed",
            "message": "Couldn't read that URL — try pasting the text instead"
        })

    return text[:32000]  # cap per AI-02
```

### Anti-Patterns to Avoid
- **Per-request Neo4j driver:** Creating `GraphDatabase.driver()` inside a route handler or `Depends()` function. Creates a new connection pool per request, exhausts TCP ports, leaks connections. Use the lifespan singleton.
- **String formatting in Cypher:** `.format()`, f-strings, or `%` in any Cypher query. The existing `drivers/neo4j.py` does this for SKIP/LIMIT — it is a Cypher injection vulnerability.
- **Hostname-only SSRF check:** Checking `if "localhost" in url` or `if url.startswith("http://10.")`. Bypassed by decimal IP notation (2130706433 = 127.0.0.1), IPv6 forms, and DNS rebinding.
- **Redirect following without re-validation:** `requests.get(url, allow_redirects=True)`. A redirect can point to a private IP even if the original URL was public.
- **Global mutable state for response data:** The existing `main.py` uses `global response_data`. Never do this in FastAPI — async request handling makes global mutable state a data race.
- **`@app.on_event("startup")` / `@app.on_event("shutdown")`:** These are deprecated as of FastAPI 0.95. Use the `lifespan` context manager.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema enforcement on GPT-4o output | Custom regex/JSON repair (existing `correct_json()` in main.py) | `client.beta.chat.completions.parse()` with Pydantic | Native structured outputs guarantees valid JSON matching your Pydantic schema; no repair loops needed |
| SSRF IP validation | Custom regex for IP ranges | Python `ipaddress` stdlib module | Handles IPv4, IPv6, decimal notation, CIDR ranges; `is_global`, `is_private`, `is_loopback` properties |
| JWT verification | Manual base64 decode + HMAC | PyJWT + PyJWKClient or clerk-backend-api | JWKS rotation, algorithm confusion attacks, claim validation edge cases |
| Neo4j connection pooling | Custom connection pool | `neo4j` driver's built-in connection pool | Driver manages pool size, reconnection, health checks |
| HTML text extraction | Custom regex | BeautifulSoup4 | Handles malformed HTML, nested tags, encoding detection |

**Key insight:** The existing codebase already has two hand-rolled anti-patterns: `correct_json()` for GPT output repair (replaced by native structured outputs) and no SSRF validation at all (needs the ipaddress + socket pattern). Both must not be carried forward.

---

## Common Pitfalls

### Pitfall 1: DNS Rebinding Bypasses SSRF Check
**What goes wrong:** The code resolves the hostname, validates the IP, then passes the original URL to `requests.get()`. Between validation and the actual TCP connection, the attacker's DNS server returns a different (private) IP.
**Why it happens:** Two separate DNS lookups — one for validation, one inside the HTTP library.
**How to avoid:** After validation, replace the hostname in the URL with the resolved IP and set the `Host` header to the original hostname. Use a custom `HTTPAdapter` to pin the TLS SNI to the original hostname. Alternatively, set `allow_redirects=False` and validate every redirect target through `validate_url()`.
**Warning signs:** Test by pointing a hostname at 127.0.0.1 in `/etc/hosts` — if that request succeeds, the validation is wrong.

### Pitfall 2: neo4j 5 vs 6 Import Differences
**What goes wrong:** Installing `neo4j==6.x` by accident (it's the current "latest" on PyPI as of Jan 2026). v6 drops implicit `close()` in `__del__` — the driver will not close itself when garbage collected.
**Why it happens:** `pip install neo4j` or `uv add neo4j` without pinning gets 6.1.0.
**How to avoid:** Pin to `neo4j==5.28.3` explicitly in pyproject.toml. STATE.md documents this decision.
**Warning signs:** `ImportError` on `Bookmarks`, different exception class hierarchy, `ClientError` becoming `TransactionError` in some paths.

### Pitfall 3: OpenAI SDK Version for Structured Outputs
**What goes wrong:** Using `openai<1.40` — `client.beta.chat.completions.parse()` was not available before 1.40.
**Why it happens:** Existing pyproject.toml pins `openai = "^0.28.0"` (very old). The existing code uses `openai.ChatCompletion.create()` which was removed in openai 1.0.
**How to avoid:** Pin `openai>=1.40,<2` in the new pyproject.toml. The new app is a full rewrite, so the old constraint is discarded.
**Warning signs:** `AttributeError: module 'openai' has no attribute 'ChatCompletion'`.

### Pitfall 4: Pydantic v1 Compatibility in FastAPI
**What goes wrong:** Using `from pydantic import validator` instead of `field_validator`, or using `.dict()` instead of `.model_dump()`. FastAPI 0.115.x ships with Pydantic v2.
**Why it happens:** Existing `models.py` uses Pydantic v1 patterns (it's fine as reference but must not be copied).
**How to avoid:** Use Pydantic v2 API throughout: `model_dump()`, `model_validate()`, `@field_validator`. The existing `from_` / `from` alias pattern in `Edge` can be reproduced in v2 with `model_config = ConfigDict(populate_by_name=True)`.
**Warning signs:** `PydanticUserError: `validator` is removed in V2`.

### Pitfall 5: Clerk SDK Requiring `httpx.Request` Not Starlette `Request`
**What goes wrong:** `clerk-backend-api.authenticate_request()` expects an `httpx.Request` object but FastAPI provides a `starlette.requests.Request`. The types are not compatible.
**Why it happens:** The SDK was designed for use with httpx clients.
**How to avoid:** Convert the Starlette request manually: extract headers and build an httpx.Request wrapper, or use the manual PyJWT fallback (Option B) which only needs the raw Authorization header string.
**Warning signs:** `AttributeError` or `TypeError` when calling `authenticate_request()`. STATE.md already flags this: "have manual PyJWT + PyJWKClient fallback pattern ready".

### Pitfall 6: BeautifulSoup html.parser vs lxml Performance
**What goes wrong:** Using the default `html.parser` on large news articles (10-50KB HTML) — significantly slower than lxml.
**Why it happens:** `BeautifulSoup(html, "html.parser")` is the default documentation example.
**How to avoid:** Always use `BeautifulSoup(html, "lxml")` and include `lxml` in dependencies.
**Warning signs:** Scraping takes >2s on moderately sized articles.

### Pitfall 7: Neo4j Session Scope
**What goes wrong:** Opening a session outside a `with` block or keeping a session open across the entire request lifecycle without closing it. Neo4j driver has a bounded session pool.
**Why it happens:** Using `driver.session()` without context manager.
**How to avoid:** Always use `with driver.session() as session:` — guarantees the session is returned to the pool on completion or exception.

---

## Code Examples

Verified patterns from official sources:

### Pydantic Schema for VC Knowledge Graph (AI-01)
```python
# apps/api/app/generate/schemas.py
# Entity types and relationships from REQUIREMENTS.md AI-01
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field

EntityType = Literal["Investor", "Project", "Round", "Narrative", "Person"]

RelationshipType = Literal[
    "LED", "INVESTED_IN", "CO_INVESTED", "RAISED",
    "FOUNDED", "PARTNERS_AT", "FOCUSES_ON", "CLASSIFIED_AS"
]

class GraphNode(BaseModel):
    id: str = Field(description="Unique slug identifier, e.g., 'paradigm-capital'")
    label: str = Field(description="Display name, e.g., 'Paradigm Capital'")
    type: EntityType
    properties: dict[str, Any] = Field(default_factory=dict,
        description="Entity properties: aum, token_ticker, chain, raise_amount, stage_focus, etc.")

class GraphEdge(BaseModel):
    source: str = Field(description="Source node id")
    target: str = Field(description="Target node id")
    relationship: RelationshipType

class VCKnowledgeGraph(BaseModel):
    """VC ecosystem knowledge graph with typed entities and relationships."""
    nodes: list[GraphNode]
    edges: list[GraphEdge]

# Response schema (maps to API contract from CONTEXT.md)
class GenerateMeta(BaseModel):
    session_id: str
    token_count: int
    source_type: Literal["url", "text"]
    processing_ms: int

class GenerateResponse(BaseModel):
    graph: dict[str, list]  # {nodes: [...], edges: [...]}
    meta: GenerateMeta

class GenerateRequest(BaseModel):
    input: str = Field(min_length=200,
        description="Text or URL to analyze (min 200 chars per AI-04)")
```

### Config Using Pydantic BaseSettings
```python
# apps/api/app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: str
    neo4j_uri: str
    neo4j_username: str
    neo4j_password: str
    clerk_secret_key: str
    clerk_authorized_party: str
    clerk_frontend_api: str  # for JWKS URL construction

    class Config:
        env_file = ".env"

settings = Settings()
```

### Docker Compose for Local Dev (INFRA-02)
```yaml
# docker-compose.yml (at repo root or apps/api/)
services:
  neo4j:
    image: neo4j:5.20-community
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      NEO4J_AUTH: neo4j/localpassword
    volumes:
      - neo4j_data:/data
    healthcheck:
      test: ["CMD-SHELL", "cypher-shell -u neo4j -p localpassword 'RETURN 1'"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  api:
    build:
      context: ./apps/api
    ports:
      - "8000:8000"
    env_file:
      - ./apps/api/.env
    depends_on:
      neo4j:
        condition: service_healthy

volumes:
  neo4j_data:
```

**Note:** Redis is referenced in INFRA-02 requirements but is not used by Phase 1 (Redis caching lands in Phase 4 via RATE-03). The docker-compose can include a Redis service definition now (it does not hurt), but the FastAPI app does not connect to it in Phase 1.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `instructor.patch()` + `openai.ChatCompletion.create(response_model=...)` | `client.beta.chat.completions.parse(response_format=PydanticModel)` | OpenAI SDK 1.40 (2024) | Native guarantees; no repair loops; no third-party dependency |
| `@app.on_event("startup")` | `@asynccontextmanager async def lifespan(app)` | FastAPI 0.95 (2023) | Cleaner resource lifecycle; old events are deprecated |
| `openai 0.x` API (`openai.ChatCompletion.create`) | `openai 1.x` API (`client = OpenAI(); client.chat.completions.create(...)`) | openai 1.0 (Oct 2023) | Breaking rewrite; old import path is gone |
| Manual JSON fix (`correct_json()`) | Native structured outputs | See above | No repair needed; guaranteed schema compliance |
| Flask route with `global response_data` | FastAPI with Pydantic schemas + dependency injection | This rewrite | Thread-safe; no shared mutable state |

**Deprecated/outdated in existing codebase:**
- `openai == "^0.28.0"`: This version is from 2023 and predates the 1.0 rewrite. `openai.ChatCompletion.create` does not exist in openai 1.x.
- `instructor == "^0.2.6"`: Replaced entirely by native structured outputs in openai 1.40.
- `flask == "^2.3.3"`: Replaced by FastAPI.
- `python = ">=3.10.0,<3.11"`: Too narrow. FastAPI + uv targets Python 3.12.

---

## Open Questions

1. **Redis in docker-compose for Phase 1**
   - What we know: INFRA-02 requires `docker-compose up` to start Neo4j AND Redis. Phase 1 does not use Redis (Redis caching is Phase 4/RATE-03).
   - What's unclear: Should the docker-compose include Redis as an inert service now, or wait for Phase 4?
   - Recommendation: Include the Redis service definition in docker-compose now (zero cost, satisfies INFRA-02 literally), but do not wire any Redis client into the Phase 1 app code.

2. **Clerk JWT verification: SDK vs manual**
   - What we know: `clerk-backend-api` is the official SDK; `fastapi-clerk-auth` v0.0.9 is low-activity (STATE.md concern); manual PyJWT is the fallback.
   - What's unclear: Whether `clerk-backend-api.authenticate_request()` works cleanly with Starlette `Request` objects without an adapter.
   - Recommendation: Start with manual PyJWT + PyJWKClient (Option B) — it has zero third-party coupling, the pattern is fully documented, and it explicitly handles the azp check that SEC-03 requires.

3. **Neo4j indexes for session_id property**
   - What we know: All nodes get `session_id` property; queries will filter by it.
   - What's unclear: Whether to create an index at startup or leave it for Phase 3 when persistence is more fully wired.
   - Recommendation: Create the index in the lifespan startup: `CREATE INDEX entity_session_id IF NOT EXISTS FOR (n:Entity) ON (n.session_id)`. It is idempotent and avoids full-graph scans from day one.

4. **apps/api/ Python version**
   - What we know: Existing pyproject.toml pins `python = ">=3.10.0,<3.11"` (very old). FastAPI + uv works on 3.12.
   - What's unclear: Whether there are any other constraints in the repo that require Python 3.10.
   - Recommendation: Target Python 3.12 in the new `apps/api/pyproject.toml`. The old Flask app and new FastAPI app are separate packages with no shared Python version constraint.

---

## Sources

### Primary (HIGH confidence)
- FastAPI official docs (https://fastapi.tiangolo.com/advanced/events/) — lifespan context manager pattern verified
- Neo4j Python Manual (https://neo4j.com/docs/python-manual/current/) — parameterized Cypher, driver lifecycle
- PyPI neo4j package (https://pypi.org/project/neo4j/) — v5.28.3 and v6.1.0 release timeline confirmed
- OWASP SSRF Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) — ipaddress module validation, DNS monitoring
- Clerk SDK README (https://github.com/clerk/clerk-sdk-python) — authenticate_request pattern
- Clerk manual JWT verification docs (https://clerk.com/docs/guides/sessions/manual-jwt-verification) — azp claim validation steps
- uv FastAPI guide (https://docs.astral.sh/uv/guides/integration/fastapi/) — pyproject.toml setup and uv run commands

### Secondary (MEDIUM confidence)
- Joshua Rogers DNS rebinding fix (https://joshua.hu/solving-fixing-interesting-problems-python-dns-rebindind-requests) — resolve-once-pin-IP pattern (single source, but technically detailed and consistent with OWASP guidance)
- zhanymkanov/fastapi-best-practices (https://github.com/zhanymkanov/fastapi-best-practices) — domain-based folder structure (community standard, widely cited)
- PyPI fastapi-clerk-auth (https://pypi.org/project/fastapi-clerk-auth/) — v0.0.9 confirmed, production/stable classification noted
- Neo4j Python Driver 6.x Changelog (https://github.com/neo4j/neo4j-python-driver/wiki/6.x-Changelog) — breaking changes verified

### Tertiary (LOW confidence)
- OpenAI structured outputs (platform.openai.com) — 403 on direct fetch; confirmed via multiple secondary sources (community, Azure docs) that `client.beta.chat.completions.parse()` is the correct API
- Token usage at `response.usage.total_tokens` — confirmed via multiple community sources but not directly verified against official Python SDK docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all library versions confirmed via PyPI; uv integration confirmed via official docs
- Architecture: HIGH — FastAPI lifespan pattern from official docs; Neo4j parameterization from official manual; SSRF pattern from OWASP + verified secondary source
- Pitfalls: HIGH — most pitfalls derived directly from examining the existing codebase (concrete bugs, not hypothetical) and official breaking change docs

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable libraries; OpenAI SDK moves fast — re-verify if >30 days)
