# Testing Patterns

**Analysis Date:** 2026-02-25

## Test Framework

**Runner:**
- Not detected - No test framework is currently configured in the project
- No pytest, unittest, nose, or similar packages in `requirements.txt` or `pyproject.toml`

**Assertion Library:**
- Not applicable (no testing framework installed)

**Run Commands:**
- No test execution commands currently available
- Testing infrastructure would need to be established

## Test File Organization

**Location:**
- Not applicable - No test files exist in the codebase
- Project root contains only production code: `main.py`, `models.py`, `drivers/`

**Naming:**
- No existing test file naming convention
- Would follow standard Python patterns: `test_*.py` or `*_test.py` if implemented

**Structure:**
- No test directory exists (no `tests/`, `test/`, or `spec/` directory)

## Test Structure

**Suite Organization:**
- Not applicable - No test suites currently implemented

**Patterns:**
- No setup/teardown patterns established
- No test fixtures defined
- No assertion patterns established

## Mocking

**Framework:**
- Not detected - No mocking framework (unittest.mock, pytest-mock, etc.) in dependencies

**Patterns:**
- Cannot assess - No existing test code to analyze

**What to Mock:**
- Not established

**What NOT to Mock:**
- Not established

## Fixtures and Factories

**Test Data:**
- Not applicable - No test fixtures or factories currently exist

**Location:**
- No fixtures directory exists

## Coverage

**Requirements:**
- Not enforced - No coverage tool (coverage.py, pytest-cov) configured in requirements
- No coverage targets or thresholds specified in configuration

**View Coverage:**
- No command available

## Test Types

**Unit Tests:**
- Not implemented
- Would be needed for:
  - `scrape_text_from_url()` in `main.py` - Test URL fetching and parsing
  - `check_if_free_plan()` in `main.py` - Test environment variable logic
  - `correct_json()` in `main.py` - Test JSON sanitization with various inputs
  - Abstract methods in `drivers/driver.py` - Test implementations

**Integration Tests:**
- Not implemented
- Would be needed for:
  - Flask route handlers (`/get_response_data`, `/graphviz`, `/get_graph_data`, `/get_graph_history`)
  - OpenAI API interaction in `get_response_data()` route
  - Database driver interactions (Neo4j and FalkorDB)

**E2E Tests:**
- Not used - No end-to-end testing framework present

## Manual Testing Approach

**Current state:**
- Project relies on manual testing via:
  - Web UI at `http://localhost:8080` (per README)
  - Direct API endpoint testing with curl/Postman (documented endpoints: `/get_response_data`, `/get_graph_data`, `/get_graph_history`, `/graphviz`)
  - Docker deployment testing (development and production modes)

**Code Quality Gates:**
- GitHub Actions workflow runs linting on pull requests: `.github/workflows/check_code.yaml`
- Makefile `lint` target enforces code quality:
  ```bash
  black . --check
  isort . --check --profile black
  flake8 . --ignore=E501,E203,W503
  mypy . --explicit-package-bases --ignore-missing-imports --install-types --non-interactive
  ```

## Critical Code Areas Without Tests

**High-risk areas lacking test coverage:**

1. **OpenAI Integration** (`main.py` lines 120-151):
   - Calls external OpenAI API with complex prompt construction
   - Depends on `instructor` library for structured output
   - Multiple exception handling paths for rate limiting and general errors
   - No validation that KnowledgeGraph response structure is correct
   - Response data transformation (`_restore` function) has no validation

2. **Database Drivers** (`drivers/neo4j.py`, `drivers/falkordb.py`):
   - No unit tests for query execution
   - Graph data retrieval and formatting not tested
   - `_process_graph_data()` static methods parse records with bare try-except
   - Environment variable validation only checked at initialization

3. **JSON Sanitization** (`main.py` lines 81-95):
   - `correct_json()` function handles malformed JSON from OpenAI
   - Regex substitutions are fragile and not tested
   - No test cases for edge cases (nested objects, arrays, escaped characters)

4. **Flask Route Handlers** (`main.py` lines 98-251):
   - No route integration tests
   - Request validation minimal (only checks for empty user_input)
   - Error responses not tested for correct status codes
   - Global `response_data` state manipulation not isolated or tested
   - Silent exception handling in `get_graph_data()` (line 228) masks errors

5. **Graph Visualization** (`main.py` lines 171-193):
   - Graphviz rendering not tested
   - File I/O operations (writing to `static/knowledge_graph`) not verified
   - URL construction for PNG endpoint not validated

## Recommended Testing Strategy

**Immediate priorities:**
1. Add pytest framework with basic fixtures for test data
2. Test JSON sanitization (`correct_json()`) with various malformed inputs
3. Test Flask route error handling with mocked OpenAI API
4. Test database driver query construction with mock database clients

**Implementation approach:**
- Use `pytest` for test runner
- Use `pytest-mock` for mocking external APIs
- Use `requests-mock` or `responses` for HTTP mocking
- Create fixtures in `tests/conftest.py` for common test data
- Use `pytest-cov` for coverage reporting

**Location for tests:**
- Create `tests/` directory at project root
- Follow pattern: `tests/test_main.py`, `tests/test_drivers.py`, `tests/test_models.py`
- Add conftest.py with shared fixtures

---

*Testing analysis: 2026-02-25*
