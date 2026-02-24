# Technology Stack

**Analysis Date:** 2026-02-25

## Languages

**Primary:**
- Python 3.10+ - Core application language

**Secondary:**
- HTML/JavaScript - Frontend templates in `templates/` directory
- YAML - Docker and workflow configuration

## Runtime

**Environment:**
- Python 3.10+ (specified in `pyproject.toml` as `>=3.10.0,<3.11`)

**Package Manager:**
- Poetry - Dependency management with lockfile `poetry.lock`
- pip - Used for requirements installation in Docker

## Frameworks

**Core:**
- Flask 2.3.3 - Web application framework, serves API endpoints and frontend
- Gunicorn 21.2.0 - Production WSGI HTTP server

**AI/NLP:**
- OpenAI 0.28.0 - LLM API client for knowledge graph generation via ChatCompletion
- Instructor 0.2.6+ - Structured output framework for OpenAI API calls with Pydantic models

**Graph Processing:**
- NetworkX 3.1 - Network/graph analysis (imported but not actively used)
- Graphviz 0.20.1 - Graph visualization and rendering to PNG/SVG formats

**Data Processing:**
- BeautifulSoup4 4.12.2 - HTML/XML parsing for web scraping
- Pydantic - Data validation and serialization via models in `models.py`

**Code Quality:**
- Black - Code formatting
- isort - Import sorting
- flake8 - Linting
- mypy - Static type checking

## Key Dependencies

**Critical:**
- neo4j 5.12.0 - Neo4j Python driver for graph database operations
- FalkorDB 1.0.1 - FalkorDB graph database driver (alternative to Neo4j)
- requests - HTTP client for web scraping and API calls
- python-dotenv 1.0.0 - Environment variable loading from `.env` files

**Data Handling:**
- matplotlib 3.7.2 - Plotting/visualization library (dependency of other packages)

## Configuration

**Environment:**
- Configured via `.env` files loaded by `python-dotenv`
- Environment variables for API keys, database credentials, and feature flags
- Example configuration in `.env.example`

**Build:**
- `pyproject.toml` - Poetry project configuration with dependencies
- `Makefile` - Development tasks (lint, format)
- Docker configuration in `docker/Dockerfile` and `docker/docker-compose.yml`

## Platform Requirements

**Development:**
- Python 3.10+
- Poetry for dependency management
- Docker and Docker Compose for containerized development

**Production:**
- Docker container with Python 3.11 base image
- Running on Gunicorn application server
- Port 8080 exposed for HTTP traffic
- Database connectivity required (Neo4j or FalkorDB)

## External Service Dependencies

**OpenAI:**
- ChatCompletion API (model: `gpt-3.5-turbo-16k`)
- Requires `OPENAI_API_KEY` environment variable

**Graph Databases:**
- Neo4j (default, optional) - For persistent knowledge graph storage
- FalkorDB (optional) - Alternative graph database backed by Redis
- Application can run without database in memory-only mode

---

*Stack analysis: 2026-02-25*
