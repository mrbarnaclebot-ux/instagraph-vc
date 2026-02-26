import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


@pytest.fixture
def mock_neo4j_driver():
    """Provides a mock Neo4j driver for tests."""
    driver = MagicMock()
    session_mock = MagicMock()
    driver.session.return_value.__enter__ = MagicMock(return_value=session_mock)
    driver.session.return_value.__exit__ = MagicMock(return_value=False)
    session_mock.run.return_value = MagicMock()
    return driver


@pytest.fixture
def app_with_mocks(mock_neo4j_driver):
    """Creates FastAPI test app with mocked Neo4j driver in app.state.

    Patches GraphDatabase.driver so the lifespan does not attempt a real
    Neo4j connection during TestClient startup (no Docker Neo4j in CI).
    """
    from app.main import app
    from app.dependencies import get_neo4j_driver

    # Override the neo4j driver dependency
    app.dependency_overrides[get_neo4j_driver] = lambda: mock_neo4j_driver

    # Patch the lifespan Neo4j driver creation so TestClient startup doesn't
    # try to connect to a real Neo4j instance.
    with patch("app.main.GraphDatabase.driver", return_value=mock_neo4j_driver):
        yield app

    app.dependency_overrides.clear()


@pytest.fixture
def valid_jwt_user():
    """Mocked JWT payload representing a valid authenticated user."""
    return {"sub": "user_test123", "azp": "http://localhost:3000"}


SAMPLE_GRAPH_RESPONSE = {
    "nodes": [
        {"id": "paradigm-capital", "label": "Paradigm Capital", "type": "Investor", "properties": {"aum": "$4.5B"}},
        {"id": "uniswap", "label": "Uniswap", "type": "Project", "properties": {"token_ticker": "UNI"}},
        {"id": "series-a-2024", "label": "Series A 2024", "type": "Round", "properties": {"amount_usd": "$50M"}},
    ],
    "edges": [
        {"source": "paradigm-capital", "target": "series-a-2024", "relationship": "LED"},
        {"source": "uniswap", "target": "series-a-2024", "relationship": "RAISED"},
    ],
}


def make_mock_openai_response(graph_data):
    """Creates a mock OpenAI parse response with the given graph data."""
    from app.generate.schemas import VCKnowledgeGraph, GraphNode, GraphEdge

    parsed = VCKnowledgeGraph(
        nodes=[GraphNode(**n) for n in graph_data["nodes"]],
        edges=[GraphEdge(**e) for e in graph_data["edges"]],
    )

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.parsed = parsed
    mock_response.usage.total_tokens = 512
    return mock_response


class TestGenerateEndpoint:
    @patch("app.generate.service._get_openai_client")
    @patch("app.auth.clerk.get_current_user")
    def test_generate_text_input_returns_graph(
        self, mock_auth, mock_openai_factory, app_with_mocks, valid_jwt_user
    ):
        mock_auth.return_value = valid_jwt_user
        mock_client = MagicMock()
        mock_client.beta.chat.completions.parse.return_value = make_mock_openai_response(SAMPLE_GRAPH_RESPONSE)
        mock_openai_factory.return_value = mock_client

        # Override auth dependency
        from app.dependencies import get_current_user
        app_with_mocks.dependency_overrides[get_current_user] = lambda: valid_jwt_user

        with TestClient(app_with_mocks) as client:
            response = client.post(
                "/api/generate",
                json={"input": "Paradigm Capital led a $50M Series A in Uniswap. " * 10},
            )

        assert response.status_code == 200
        data = response.json()
        assert "graph" in data
        assert "nodes" in data["graph"]
        assert "edges" in data["graph"]
        assert "meta" in data
        assert data["meta"]["source_type"] == "text"
        assert "session_id" in data["meta"]
        assert "token_count" in data["meta"]
        assert "processing_ms" in data["meta"]

    def test_generate_rejects_missing_auth(self, app_with_mocks):
        # Ensure dev bypass is off so missing token is rejected (bypass is dev-only)
        with patch("app.auth.clerk.settings") as mock_settings:
            mock_settings.dev_skip_auth = False
            with TestClient(app_with_mocks) as client:
                response = client.post(
                    "/api/generate",
                    json={"input": "Some funding announcement text. " * 10},
                )
        assert response.status_code == 401
        assert response.json()["detail"]["error"] == "unauthorized"

    @patch("app.auth.clerk.get_current_user")
    def test_generate_rejects_short_input(self, mock_auth, app_with_mocks, valid_jwt_user):
        from app.dependencies import get_current_user
        app_with_mocks.dependency_overrides[get_current_user] = lambda: valid_jwt_user

        with TestClient(app_with_mocks) as client:
            response = client.post(
                "/api/generate",
                json={"input": "too short"},
                headers={"Authorization": "Bearer fake.jwt.token"},
            )

        assert response.status_code == 400
        detail = response.json()["detail"]
        assert detail["error"] == "input_too_short"
        assert "Input too short" in detail["message"]
        assert "paste a full funding announcement" in detail["message"]

    @patch("app.generate.service._get_openai_client")
    @patch("app.scraper.scraper.validate_url")
    @patch("app.scraper.scraper.requests.get")
    def test_generate_url_input_scrapes_and_extracts(
        self, mock_requests_get, mock_validate, mock_openai_factory, app_with_mocks, valid_jwt_user
    ):
        from app.dependencies import get_current_user
        app_with_mocks.dependency_overrides[get_current_user] = lambda: valid_jwt_user

        # Mock the scraper
        mock_response = MagicMock()
        mock_response.is_redirect = False
        mock_response.text = "<html><body>" + "<p>Paradigm Capital invested $50M in Uniswap. </p>" * 30 + "</body></html>"
        mock_response.raise_for_status.return_value = None
        mock_requests_get.return_value = mock_response

        # Mock OpenAI
        mock_client = MagicMock()
        mock_client.beta.chat.completions.parse.return_value = make_mock_openai_response(SAMPLE_GRAPH_RESPONSE)
        mock_openai_factory.return_value = mock_client

        with TestClient(app_with_mocks) as client:
            response = client.post(
                "/api/generate",
                json={"input": "https://techcrunch.com/article"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["meta"]["source_type"] == "url"
