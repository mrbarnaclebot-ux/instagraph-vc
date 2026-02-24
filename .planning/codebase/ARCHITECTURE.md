# Architecture

**Analysis Date:** 2026-02-25

## Pattern Overview

**Overall:** Layered Architecture with Pluggable Database Abstraction

**Key Characteristics:**
- Separation of concerns via Flask web framework
- Pluggable graph database layer using an abstract driver pattern
- AI-powered knowledge graph generation via OpenAI API
- Frontend-backend separation with REST API communication
- Support for multiple graph database backends (Neo4j, FalkorDB)

## Layers

**Presentation Layer:**
- Purpose: Handle user interaction and graph visualization
- Location: `templates/index.html`
- Contains: Vue.js single-page application, Cytoscape graph rendering, form handling
- Depends on: REST API endpoints from main.py
- Used by: End users via web browser

**API/Web Framework Layer:**
- Purpose: Expose HTTP endpoints for graph operations and data retrieval
- Location: `main.py` (Flask routes)
- Contains: Route handlers for `/get_response_data`, `/get_graph_data`, `/get_graph_history`, `/graphviz`
- Depends on: OpenAI API, graph driver abstraction, Pydantic models
- Used by: Frontend Vue.js application

**AI/Processing Layer:**
- Purpose: Generate knowledge graphs from text using OpenAI's language model
- Location: `main.py` (lines 121-142)
- Contains: OpenAI API integration via instructor library, JSON response handling, data transformation
- Depends on: OpenAI API key, KnowledgeGraph model schema
- Used by: Web API layer when processing user input

**Database Abstraction Layer:**
- Purpose: Provide unified interface for multiple graph database implementations
- Location: `drivers/driver.py` (abstract base class)
- Contains: Abstract methods `get_response_data()`, `get_graph_data()`, `get_graph_history()`
- Depends on: Concrete driver implementations
- Used by: Main API layer, database operations

**Concrete Database Drivers:**
- Purpose: Implement specific graph database operations
- Location: `drivers/neo4j.py`, `drivers/falkordb.py`
- Contains: Neo4j GraphDatabase client, FalkorDB client, Cypher query execution
- Depends on: Driver abstract base class
- Used by: Main API layer via driver polymorphism

**Data Model Layer:**
- Purpose: Define structured schema for knowledge graphs
- Location: `models.py`
- Contains: Pydantic models (KnowledgeGraph, Node, Edge, Metadata)
- Depends on: Pydantic BaseModel
- Used by: AI processing layer, database operations, API responses

## Data Flow

**Knowledge Graph Creation Flow:**

1. User submits text/URL via web form (`templates/index.html`)
2. Frontend makes POST request to `/get_response_data` endpoint (`main.py` line 98)
3. If URL provided, scrape text using BeautifulSoup (`scrape_text_from_url()` at line 37)
4. Send text to OpenAI with KnowledgeGraph schema via instructor library (`main.py` lines 121-130)
5. OpenAI returns structured KnowledgeGraph response (nodes, edges, metadata)
6. Transform response data: restore "from" field from "from_" alias (`main.py` lines 135-142)
7. If graph driver available, store in database via `driver.get_response_data()` (`main.py` line 155)
8. Return graph data as JSON response

**Graph Rendering Flow:**

1. Frontend calls `/get_graph_data` endpoint after successful graph creation
2. Backend checks if driver exists (graph database in use)
3. If driver exists: query database for nodes and edges via Cypher queries
4. If no driver: use in-memory response_data global variable
5. Transform nodes/edges to Cytoscape format
6. Return JSON with elements structure
7. Frontend renders graph using Cytoscape library with COSE layout

**Graph History Retrieval Flow:**

1. Frontend requests `/get_graph_history` (paginated, 10 per page)
2. Driver queries graph database with pagination (skip/limit)
3. `_process_graph_data()` static method transforms Neo4j/FalkorDB records
4. Return formatted graph_history array with from_node, relationship, to_node
5. Frontend displays clickable history items that can be rendered

**Graph Visualization (Graphviz) Flow:**

1. Frontend submits POST to `/graphviz` endpoint
2. Build Digraph using in-memory response_data
3. Add nodes with label and type info
4. Add edges with relationship labels
5. Render to both .gv text format and .png image format
6. Save PNG to `static/knowledge_graph.png`
7. Return URL pointing to generated PNG

**State Management:**

- Global `response_data` variable stores latest knowledge graph in memory (line 28)
- Global `driver` variable holds initialized database connection (line 31)
- Database driver manages session lifecycle and query execution
- Frontend uses Vue.js reactive refs for UI state (isLoading, graphHistory, errorMessage)

## Key Abstractions

**Driver Interface:**
- Purpose: Enable swappable database implementations
- Examples: `drivers/neo4j.py`, `drivers/falkordb.py`
- Pattern: Abstract base class with three abstract methods; concrete implementations override methods

**KnowledgeGraph Model:**
- Purpose: Enforce schema consistency for AI-generated graphs
- Examples: `models.py` contains Metadata, Node, Edge, KnowledgeGraph classes
- Pattern: Pydantic BaseModel with Field descriptors for AI prompt guidance

**Web Routes:**
- Purpose: Decouple HTTP layer from business logic
- Examples: `@app.route("/get_response_data")`, `@app.route("/get_graph_data")`
- Pattern: Flask decorators with request/response transformation

## Entry Points

**Main Application:**
- Location: `main.py`
- Triggers: `python main.py [--debug] [--port PORT] [--graph neo4j|falkordb]`
- Responsibilities:
  - Parse command-line arguments for port, debug mode, graph database selection
  - Initialize selected graph driver (Neo4j or FalkorDB)
  - Start Flask web server at specified port
  - Register all API routes

**Web Interface:**
- Location: `templates/index.html`
- Triggers: Browser requests http://localhost:{PORT}/
- Responsibilities:
  - Render form for user input (text or URL)
  - Display loading state during API calls
  - Render knowledge graph using Cytoscape
  - Display graph history sidebar with pagination

## Error Handling

**Strategy:** Try-catch with logging and user-facing error messages

**Patterns:**

- OpenAI API errors: Catch RateLimitError (429 response) and generic Exception; log and return error JSON
- Graph database errors: Catch exceptions during driver initialization; log and raise ValueError
- URL scraping errors: Check HTTP response status; return error message if not 200
- JSON parsing errors: Attempt regex correction of malformed JSON; log and return None
- Frontend errors: Display error message banner for 5 seconds; show console errors for debugging

## Cross-Cutting Concerns

**Logging:** Use Python `logging` module (imported at top of `main.py`, `drivers/neo4j.py`, `drivers/falkordb.py`)
- Info level: Database connections, web scrapes, OpenAI calls
- Warning level: Deprecated config variables (NEO4J_URL vs NEO4J_URI)
- Error level: Exception details with exc_info=True for debugging

**Validation:**
- Pydantic models validate knowledge graph structure during AI response parsing
- HTTP request validation: Check required fields (user_input not empty)
- Database validation: Test connection with simple RETURN query at initialization

**Authentication:**
- OpenAI API key via environment variable `OPENAI_API_KEY`
- Graph database credentials via environment variables (NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_URI or FALKORDB_URL)
- No user authentication; rate limiting via USER_PLAN environment variable (free plan gets 20-second retry header)

---

*Architecture analysis: 2026-02-25*
