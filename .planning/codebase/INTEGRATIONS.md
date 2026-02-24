# External Integrations

**Analysis Date:** 2026-02-25

## APIs & External Services

**OpenAI:**
- ChatCompletion API - Generates knowledge graphs from user input via LLM
  - SDK/Client: `openai` package (0.28.0)
  - Auth: `OPENAI_API_KEY` environment variable
  - Model: `gpt-3.5-turbo-16k`
  - Used in: `main.py` lines 121-130 - POST `/get_response_data` endpoint
  - Response processed through Pydantic `KnowledgeGraph` model with Instructor structured outputs

**Web Scraping:**
- HTTP requests for URL content retrieval
  - Client: `requests` package
  - Used in: `main.py` function `scrape_text_from_url()` (lines 37-45)
  - Parses HTML with BeautifulSoup4 to extract paragraph text

## Data Storage

**Graph Databases:**

**Neo4j (Primary Option):**
- Type: Property graph database
- Connection: `NEO4J_URI` environment variable (also accepts legacy `NEO4J_URL`)
- Authentication: `NEO4J_USERNAME` and `NEO4J_PASSWORD` environment variables
- Client: `neo4j` package (5.12.0) - Native Neo4j Python driver
- Implementation: `drivers/neo4j.py` - Neo4j class extends Driver abstract base
- Operations:
  - `get_response_data()` - UNWIND nodes and relationships, MERGE operations
  - `get_graph_data()` - Query and return all nodes and edges for visualization
  - `get_graph_history()` - Retrieve paginated graph history with timestamp ordering
- Query Language: Cypher

**FalkorDB (Alternative Option):**
- Type: Graph database built on Redis
- Connection: `FALKORDB_URL` environment variable (defaults to `redis://localhost:6379`)
- Client: `FalkorDB` package (1.0.1) - FalkorDB Python driver
- Implementation: `drivers/falkordb.py` - FalkorDB class extends Driver abstract base
- Operations:
  - `get_response_data()` - UNWIND nodes and relationships, MERGE operations
  - `get_graph_data()` - Query and return all nodes and edges
  - `get_graph_history()` - Retrieve paginated graph history
- Graph name: `falkordb` (selected by default)
- Connection pattern: Uses `.from_url()` factory method

**Database Selection:**
- Configurable via CLI argument `--graph neo4j|falkordb` in `main.py` (line 263)
- Default: Neo4j (with fallback to None if connection fails)
- Both share abstract Driver interface in `drivers/driver.py`

**In-Memory Storage:**
- Global `response_data` variable in `main.py` (line 28)
- Stores most recent knowledge graph result from OpenAI
- Used when no graph database driver is initialized
- Exposed via `/get_graph_data` endpoint (lines 196-229)

## Authentication & Identity

**Auth Provider:** None implemented

**Manual API Key Management:**
- OpenAI API key passed via environment variable `OPENAI_API_KEY`
- Database credentials (Neo4j) via `NEO4J_USERNAME` and `NEO4J_PASSWORD`
- No user authentication or authorization layer in application

## Monitoring & Observability

**Error Tracking:** None detected

**Logs:**
- Python `logging` module used throughout codebase
- Standard logging calls in:
  - Web scraping completion: `main.py` line 44
  - OpenAI API calls: `main.py` line 119
  - Rate limit errors: `main.py` lines 144-147
  - General exceptions: `main.py` lines 148-151
  - Database errors: `main.py` line 156, 159, 250
  - Neo4j connection: `drivers/neo4j.py` lines 27, 29
  - FalkorDB connection: `drivers/falkordb.py` lines 18, 20
- No centralized logging aggregation

## CI/CD & Deployment

**Hosting:**
- Docker containerization available
- Port 8080 exposed for HTTP traffic
- Gunicorn as production WSGI server

**CI Pipeline:**
- GitHub Actions workflow: `check_code.yaml`
- Code quality checks via Makefile:
  - `make lint` - Black, isort, flake8, mypy
  - `make format` - Auto-format with Black and isort

**Docker Configuration:**
- `docker/Dockerfile` - Production image with Python 3.11
- `docker/docker-compose.yml` - Service orchestration
- Exposes service on port 8080

## Environment Configuration

**Required env vars:**
- `OPENAI_API_KEY` - OpenAI API authentication (critical for LLM operations)
- `NEO4J_URI` - Neo4j database URI (required only if using Neo4j driver)
- `NEO4J_USERNAME` - Neo4j authentication username
- `NEO4J_PASSWORD` - Neo4j authentication password
- `FALKORDB_URL` - FalkorDB connection URL (defaults to `redis://localhost:6379`)
- `USER_PLAN` - Feature flag for rate limiting (set to "free" for rate limiting)

**Optional env vars:**
- `NEO4J_URL` - Legacy Neo4j URI (deprecated, use `NEO4J_URI`)

**Secrets location:**
- `.env` file (not committed to git)
- `.env.example` provided as template

## Webhooks & Callbacks

**Incoming:** None detected

**Outgoing:** None detected

---

*Integration audit: 2026-02-25*
