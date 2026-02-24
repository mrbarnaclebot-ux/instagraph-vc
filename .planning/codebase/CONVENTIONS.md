# Coding Conventions

**Analysis Date:** 2026-02-25

## Naming Patterns

**Files:**
- Snake_case for module files: `main.py`, `models.py`, `driver.py`, `neo4j.py`, `falkordb.py`
- Directory names use underscores: `drivers/`

**Functions:**
- Snake_case for all function names: `scrape_text_from_url()`, `check_if_free_plan()`, `get_response_data()`, `add_header()`
- Private helper functions use leading underscore: `_restore()`, `_process_graph_data()`
- Flask route functions are descriptive of their purpose: `visualize_knowledge_graph_with_graphviz()`, `get_graph_history()`

**Variables:**
- Snake_case for all variables: `response_data`, `user_input`, `per_page`, `skip`, `total_count`
- Global variables declared explicitly: `response_data = ""`, `driver: Driver | None = None`
- Constants appear as module-level assignments: `app = Flask(__name__)`

**Types:**
- PascalCase for class names: `Driver`, `Neo4j`, `FalkorDB`, `Metadata`, `Node`, `Edge`, `KnowledgeGraph`
- Type hints use modern Python syntax: `def get_graph_data(self) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:`
- Type imports from `typing` module: `from typing import Any, Dict, List`

## Code Style

**Formatting:**
- Tool: Black (specified in pyproject.toml and Makefile)
- Configuration: Default Black formatter settings (line length: 88 characters)
- Enforced via CI/CD pipeline on pull requests

**Linting:**
- Tool: Ruff (configured in pyproject.toml)
- Selected rules: `['E', 'W', 'F', 'I', 'B', 'C4', 'ARG', 'SIM']`
- Ignored rules: `['W291', 'W292', 'W293']` (whitespace-related)
- Additional tools: flake8, mypy (via Makefile)
- Flake8 ignores: `E501` (line length), `E203`, `W503` (incompatible with Black)

**Type Checking:**
- Tool: mypy (enforced in Makefile)
- Configuration: Explicit package bases enabled, missing imports ignored
- Command: `mypy . --explicit-package-bases --ignore-missing-imports --install-types --non-interactive`

**Import Organization:**
- Tool: isort (enforced in Makefile)
- Configuration: Uses `--profile black` to resolve conflicts with Black
- Order observed in code:
  1. Standard library imports (e.g., `argparse`, `json`, `logging`, `os`, `re`)
  2. Third-party imports (e.g., `instructor`, `openai`, `requests`, `bs4`, `dotenv`, `flask`, `graphviz`, `neo4j`, `falkordb`, `pydantic`)
  3. Local imports (e.g., `from drivers.driver import Driver`, `from models import KnowledgeGraph`)

## Error Handling

**Patterns:**
- Broad try-except blocks followed by specific exception handling
- Specific exception handling first, generic `Exception` fallback:
  ```python
  try:
      # attempt operation
  except openai.error.RateLimitError as e:
      logging.warning("%s", e)
      return jsonify({"error": "rate limitation"}), 429
  except Exception as e:
      logging.error("%s", e)
      return jsonify({"error": "unknown error"}), 400
  ```
- Silent failures with empty returns (seen in `get_graph_data()` route):
  ```python
  except Exception:
      return jsonify({"elements": {"nodes": [], "edges": []}})
  ```
- Validation errors with HTTP status codes in Flask routes (400, 429, 500)
- Configuration errors raise ValueError on missing required environment variables

## Logging

**Framework:** Python's standard `logging` module

**Patterns:**
- Logging configuration appears implicit (no explicit logger setup in code)
- Info-level logs for successful operations:
  ```python
  logging.info("web scrape done")
  logging.info("starting openai call: %s", prompt)
  logging.info("Neo4j database connected successfully!")
  ```
- Warning-level logs for rate limits:
  ```python
  logging.warning("%s", e)
  logging.warning("Obsolete: Please define NEO4J_URI instead")
  ```
- Error-level logs with exception info for failures:
  ```python
  logging.error("SanitizationError: %s for JSON: %s", str(e), json_str, exc_info=True)
  logging.error("An error occurred during the Graph operation: %s", e)
  ```
- String formatting uses `%s` style (not f-strings) for consistency in logging module

## Comments

**When to Comment:**
- Warning comments for important implementation details:
  ```python
  # WARING: Notice that this is "from_", not "from"
  # Its now a dict, no need to worry about json loading so many times
  ```
- Function-level comments explain purpose and assumptions:
  ```python
  # Function to scrape text from a website
  # copy "from_" prop to "from" prop on all edges
  ```
- Configuration comments in environment setup:
  ```python
  # If a Graph database set, then driver is used to store information
  # Default try to connect to Neo4j for backward compatibility
  ```

**Docstrings:**
- Used for classes and public methods
- Google-style docstrings (seen in abstract base class):
  ```python
  """
  Abstract method to get graph data.
  """
  ```
- Parameter documentation with `:param` tags in longer docstrings:
  ```python
  """
  ..description..
  :param skip: The number of items to skip.
  :param per_page: The number of items per page.
  :return: The graph history data.
  """
  ```

## Function Design

**Size:** Functions range from 5-50 lines; routes are typically 10-30 lines

**Parameters:**
- Explicit parameters with type hints in signatures
- Type hints use modern syntax: `response_data: Any`, `skip: int`, `per_page: int`
- Flask route functions receive arguments from request object

**Return Values:**
- Consistent return types with type hints
- Flask routes return tuple: `(data, status_code)` or single jsonify response
- Driver methods return typed data structures: `tuple[list[dict[str, Any]], list[dict[str, Any]]]`
- Methods may return dict with error key on exception: `{"error": str(e)}`

## Module Design

**Exports:**
- Abstract base class `Driver` in `drivers/driver.py` defines interface
- Concrete implementations `Neo4j` and `FalkorDB` in separate modules
- Pydantic models (`Metadata`, `Node`, `Edge`, `KnowledgeGraph`) exported from `models.py`

**Inheritance Pattern:**
- Abstract base classes define contracts: `class Neo4j(Driver):`
- Implementations override abstract methods: `@abstractmethod` decorator enforced via ABC

**Global State:**
- Flask app instance created at module level: `app = Flask(__name__)`
- Global response data storage: `response_data = ""`
- Global driver instance: `driver: Driver | None = None`

## Code Organization in main.py

**Pattern observed:**
1. Imports (standard library, third-party, local)
2. Flask app initialization and configuration
3. Utility functions (scraping, validation, JSON correction)
4. Flask route handlers (GET/POST endpoints)
5. Graph visualization and data retrieval routes
6. Main entry point with argument parsing

---

*Convention analysis: 2026-02-25*
