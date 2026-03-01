import json
import pytest
from unittest.mock import MagicMock, patch, call
from neo4j.exceptions import ServiceUnavailable, SessionExpired

from app.graph.repository import persist_graph, get_graph_by_session


SAMPLE_NODES = [
    {"id": "paradigm", "label": "Paradigm", "type": "Investor", "properties": {"aum": "$4B"}},
    {"id": "uniswap", "label": "Uniswap", "type": "Project", "properties": {"ticker": "UNI"}},
]

SAMPLE_EDGES = [
    {"source": "paradigm", "target": "uniswap", "relationship": "INVESTED_IN"},
]


def _make_driver():
    """Creates a mock Neo4j driver with session context manager."""
    driver = MagicMock()
    session = MagicMock()
    driver.session.return_value.__enter__ = MagicMock(return_value=session)
    driver.session.return_value.__exit__ = MagicMock(return_value=False)
    return driver, session


class TestPersistGraph:
    def test_persists_nodes_and_edges(self):
        driver, session = _make_driver()
        persist_graph(driver, session_id="sess-1", nodes=SAMPLE_NODES, edges=SAMPLE_EDGES, user_id="user_abc")

        assert session.run.call_count == 2
        # First call: nodes UNWIND
        node_call = session.run.call_args_list[0]
        assert "UNWIND $nodes" in node_call[0][0]
        assert node_call[1]["session_id"] == "sess-1"
        assert node_call[1]["user_id"] == "user_abc"
        # Nodes should have properties serialized as JSON strings
        for n in node_call[1]["nodes"]:
            assert isinstance(n["properties"], str)
            json.loads(n["properties"])  # should not raise

        # Second call: edges UNWIND
        edge_call = session.run.call_args_list[1]
        assert "UNWIND $edges" in edge_call[0][0]
        assert edge_call[1]["session_id"] == "sess-1"

    def test_serializes_properties_to_json(self):
        driver, session = _make_driver()
        nodes = [{"id": "a", "label": "A", "type": "Investor", "properties": {"key": "val"}}]
        persist_graph(driver, session_id="s1", nodes=nodes, edges=[], user_id="u1")

        persisted_nodes = session.run.call_args_list[0][1]["nodes"]
        assert persisted_nodes[0]["properties"] == '{"key": "val"}'

    def test_handles_empty_properties(self):
        driver, session = _make_driver()
        nodes = [{"id": "a", "label": "A", "type": "Investor"}]
        persist_graph(driver, session_id="s1", nodes=nodes, edges=[], user_id="u1")

        persisted_nodes = session.run.call_args_list[0][1]["nodes"]
        assert persisted_nodes[0]["properties"] == "{}"

    def test_retries_on_service_unavailable(self):
        driver = MagicMock()
        call_count = 0

        def side_effect():
            nonlocal call_count
            call_count += 1
            session = MagicMock()
            if call_count == 1:
                session.run.side_effect = ServiceUnavailable("Neo4j down")
            else:
                session.run.return_value = MagicMock()
            return session

        ctx = MagicMock()
        ctx.__enter__ = MagicMock(side_effect=lambda: side_effect())
        ctx.__exit__ = MagicMock(return_value=False)
        driver.session.return_value = ctx

        # Mock time.sleep to avoid real delay
        with patch("app.graph.repository.time.sleep"):
            persist_graph(driver, session_id="s1", nodes=SAMPLE_NODES, edges=SAMPLE_EDGES)

    def test_raises_after_retry_exhausted(self):
        driver = MagicMock()
        session = MagicMock()
        session.run.side_effect = ServiceUnavailable("still down")
        driver.session.return_value.__enter__ = MagicMock(return_value=session)
        driver.session.return_value.__exit__ = MagicMock(return_value=False)

        with patch("app.graph.repository.time.sleep"):
            with pytest.raises(ServiceUnavailable):
                persist_graph(driver, session_id="s1", nodes=SAMPLE_NODES, edges=SAMPLE_EDGES)

    def test_default_user_id_is_anonymous(self):
        driver, session = _make_driver()
        persist_graph(driver, session_id="s1", nodes=SAMPLE_NODES, edges=SAMPLE_EDGES)
        node_call = session.run.call_args_list[0]
        assert node_call[1]["user_id"] == "anonymous"


class TestGetGraphBySession:
    def test_returns_none_when_no_nodes(self):
        driver, session = _make_driver()
        session.run.return_value = iter([])  # empty result
        result = get_graph_by_session(driver, "nonexistent-session")
        assert result is None

    def test_returns_graph_dict(self):
        driver, session = _make_driver()
        node_records = [
            {"id": "paradigm", "label": "Paradigm", "type": "Investor",
             "properties": '{"aum": "$4B"}', "session_id": "s1", "created_by": "user_abc"},
        ]
        edge_records = [
            {"source": "paradigm", "target": "uniswap", "relationship": "INVESTED_IN"},
        ]
        # First run call returns nodes, second returns edges
        session.run.side_effect = [iter(node_records), iter(edge_records)]

        result = get_graph_by_session(driver, "s1", user_id="user_abc")
        assert result is not None
        assert len(result["nodes"]) == 1
        assert result["nodes"][0]["properties"] == {"aum": "$4B"}
        assert len(result["edges"]) == 1

    def test_ownership_check_rejects_different_user(self):
        driver, session = _make_driver()
        node_records = [
            {"id": "paradigm", "label": "Paradigm", "type": "Investor",
             "properties": "{}", "session_id": "s1", "created_by": "user_other"},
        ]
        session.run.return_value = iter(node_records)

        result = get_graph_by_session(driver, "s1", user_id="user_abc")
        assert result is None

    def test_ownership_allows_anonymous_graphs(self):
        driver, session = _make_driver()
        node_records = [
            {"id": "a", "label": "A", "type": "Investor",
             "properties": "{}", "session_id": "s1", "created_by": "anonymous"},
        ]
        edge_records = []
        session.run.side_effect = [iter(node_records), iter(edge_records)]

        result = get_graph_by_session(driver, "s1", user_id="user_abc")
        assert result is not None

    def test_ownership_allows_dev_user_legacy(self):
        driver, session = _make_driver()
        node_records = [
            {"id": "a", "label": "A", "type": "Investor",
             "properties": "{}", "session_id": "s1", "created_by": "dev-user"},
        ]
        edge_records = []
        session.run.side_effect = [iter(node_records), iter(edge_records)]

        result = get_graph_by_session(driver, "s1", user_id="user_abc")
        assert result is not None

    def test_retries_on_session_expired(self):
        driver = MagicMock()
        call_count = 0

        def side_effect():
            nonlocal call_count
            call_count += 1
            session = MagicMock()
            if call_count == 1:
                session.run.side_effect = SessionExpired("session expired")
            else:
                session.run.return_value = iter([])
            return session

        ctx = MagicMock()
        ctx.__enter__ = MagicMock(side_effect=lambda: side_effect())
        ctx.__exit__ = MagicMock(return_value=False)
        driver.session.return_value = ctx

        with patch("app.graph.repository.time.sleep"):
            result = get_graph_by_session(driver, "s1")
            assert result is None  # empty = not found

    def test_no_user_id_skips_ownership_check(self):
        driver, session = _make_driver()
        node_records = [
            {"id": "a", "label": "A", "type": "Investor",
             "properties": "{}", "session_id": "s1", "created_by": "anyone"},
        ]
        edge_records = []
        session.run.side_effect = [iter(node_records), iter(edge_records)]

        result = get_graph_by_session(driver, "s1")  # no user_id
        assert result is not None
