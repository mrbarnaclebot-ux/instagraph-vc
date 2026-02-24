# Codebase Structure

**Analysis Date:** 2026-02-25

## Directory Layout

```
instagraph-vc/
├── main.py                 # Flask application entry point and API routes
├── models.py               # Pydantic data models (KnowledgeGraph, Node, Edge)
├── pyproject.toml          # Poetry project configuration
├── requirements.txt        # pip dependencies list
├── poetry.lock             # Poetry lock file
├── .env.example            # Template for environment variables
├── Makefile                # Build and utility commands
├── README.md               # Project documentation
├── CONTRIBUTION.MD         # Contribution guidelines
├── LICENSE                 # MIT License
├── drivers/                # Graph database abstraction and implementations
│   ├── driver.py          # Abstract Driver base class
│   ├── neo4j.py           # Neo4j database driver implementation
│   └── falkordb.py        # FalkorDB database driver implementation
├── templates/              # HTML templates for web interface
│   └── index.html         # Main single-page application template
├── docker/                 # Docker configuration
│   ├── Dockerfile         # Production Dockerfile
│   ├── DockerfileDev      # Development Dockerfile
│   ├── docker-compose.yml # Production Docker Compose
│   └── docker-compose-dev.yml # Development Docker Compose
├── .github/                # GitHub configuration
│   ├── workflows/         # CI/CD workflows
│   └── ISSUE_TEMPLATE/    # Issue templates
├── .planning/              # Planning documentation (GSD tool output)
│   └── codebase/          # Codebase analysis documents
└── .gitignore             # Git ignore rules
```

## Directory Purposes

**Root Directory:**
- Purpose: Application entry point and configuration
- Contains: Main application file, environment templates, Docker configs, project metadata
- Key files: `main.py`, `models.py`, `.env.example`

**`drivers/` Directory:**
- Purpose: Graph database abstraction layer
- Contains: Abstract Driver class and concrete implementations for Neo4j and FalkorDB
- Key files: `driver.py` (interface), `neo4j.py`, `falkordb.py` (implementations)

**`templates/` Directory:**
- Purpose: Frontend web application templates
- Contains: Vue.js single-page application with Cytoscape graph visualization
- Key files: `index.html` (main web UI)

**`docker/` Directory:**
- Purpose: Container orchestration and deployment configuration
- Contains: Dockerfile variants, Docker Compose files for dev/prod
- Key files: `docker-compose.yml` (production), `docker-compose-dev.yml` (development)

**`.github/` Directory:**
- Purpose: GitHub-specific configuration and workflows
- Contains: Issue templates, CI/CD workflow definitions
- Key files: GitHub Actions workflow YAML files

**`.planning/` Directory:**
- Purpose: Generated codebase analysis and planning documents
- Contains: Architecture, structure, conventions, testing, and concerns documents
- Key files: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

## Key File Locations

**Entry Points:**
- `main.py`: Flask application entry point; contains all API routes and initialization logic
- `templates/index.html`: Web interface entry point; contains Vue.js SPA and all frontend logic

**Configuration:**
- `.env.example`: Template showing all required environment variables (OPENAI_API_KEY, database credentials)
- `pyproject.toml`: Poetry project metadata and dependencies (Python 3.10, Flask, OpenAI, etc.)
- `docker-compose.yml`: Production deployment configuration with gunicorn

**Core Logic:**
- `models.py`: Pydantic models defining KnowledgeGraph schema (Metadata, Node, Edge structures)
- `drivers/driver.py`: Abstract Driver interface with three methods: get_graph_data(), get_response_data(), get_graph_history()
- `drivers/neo4j.py`: Neo4j implementation using GraphDatabase client and Cypher queries
- `drivers/falkordb.py`: FalkorDB implementation using FalkorDB client and Cypher queries

**Testing:**
- No test directory or test files present in codebase

## Naming Conventions

**Files:**
- Python files: lowercase_with_underscores.py (e.g., `main.py`, `models.py`)
- HTML files: lowercase.html (e.g., `index.html`)
- Config files: lowercase or UPPERCASE with extensions (e.g., `.env.example`, `Makefile`, `Dockerfile`)

**Directories:**
- Driver implementations: lowercase (e.g., `drivers/`, `templates/`, `docker/`)
- Special directories: dot-prefixed for hidden/config (e.g., `.github/`, `.planning/`)

**Python Classes:**
- PascalCase for all classes (e.g., KnowledgeGraph, Node, Edge, Metadata, Driver, Neo4j, FalkorDB)
- Pydantic models follow same convention

**Python Functions:**
- snake_case for all functions (e.g., scrape_text_from_url, check_if_free_plan, correct_json)
- Private/internal functions prefixed with underscore (e.g., _restore, _process_graph_data)

**Python Constants:**
- UPPERCASE_WITH_UNDERSCORES where used (implicit in environment variable names)

**JavaScript/Vue:**
- camelCase for functions (e.g., handleFormSubmit, createGraph, renderGraph, postData)
- camelCase for Vue reactive refs (e.g., isLoading, userInput, graphHistory)

**Routes:**
- Lowercase with underscores (e.g., `/get_response_data`, `/get_graph_data`, `/get_graph_history`)

## Where to Add New Code

**New Feature (Graph Operation):**
- Primary code: `main.py` (add new @app.route decorator)
- Database queries: `drivers/driver.py` (add abstract method), then implement in `drivers/neo4j.py` and `drivers/falkordb.py`
- Data models: `models.py` (add Pydantic model if new data structure needed)

**New Component/Module:**
- Driver implementation: Create new file in `drivers/` directory, inherit from Driver abstract class
- Frontend component: Add to `templates/index.html` in Vue.js setup() function
- New database backend support: Create `drivers/newdb.py`, implement Driver interface

**Utilities:**
- Helper functions: Add to `main.py` as module-level functions (follow existing pattern like scrape_text_from_url)
- Shared data models: Add to `models.py` as Pydantic BaseModel subclass
- Reusable driver logic: Add to `drivers/driver.py` as concrete methods in base class if applicable to all drivers

**Frontend Utilities:**
- JavaScript utilities: Add as standalone functions in `templates/index.html` within Vue app context
- Follow camelCase naming and add JSDoc comments above functions

## Special Directories

**`static/` Directory:**
- Purpose: Static asset storage for generated files
- Generated: Yes (Graphviz PNG outputs)
- Committed: No (added via .gitignore, created at runtime)
- Usage: `/graphviz` endpoint renders knowledge graphs as PNG and saves to `static/knowledge_graph.png`

**`.git/` Directory:**
- Purpose: Git version control metadata
- Generated: Yes (by git)
- Committed: No (version control folder)

**`__pycache__/` Directories:**
- Purpose: Python bytecode cache
- Generated: Yes (by Python interpreter)
- Committed: No (excluded via .gitignore)

## Module Imports and Dependencies

**Top-level imports in main.py:**
```python
import argparse                    # CLI argument parsing
import json                        # JSON serialization
import logging                     # Logging framework
import os                          # Environment variables
import instructor                  # OpenAI structured output
import openai                      # OpenAI API client
import requests                    # HTTP requests for URL scraping
from bs4 import BeautifulSoup     # HTML parsing
from dotenv import load_dotenv    # Environment variable loading
from flask import Flask, ...       # Web framework
from graphviz import Digraph      # Graph visualization
from drivers.driver import Driver # Abstract driver interface
from drivers.falkordb import FalkorDB
from drivers.neo4j import Neo4j
from models import KnowledgeGraph  # Pydantic data model
```

**Driver imports:**
- Neo4j: `from neo4j import GraphDatabase`
- FalkorDB: `from falkordb import FalkorDB as FalkorDBDriver`

**Frontend imports (via CDN):**
- Vue 3: Loaded from unpkg.com
- Cytoscape: Loaded from cdnjs.cloudflare.com
- Tailwind CSS: Loaded from cdn.jsdelivr.net

---

*Structure analysis: 2026-02-25*
