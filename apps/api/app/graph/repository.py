import json
import time
from typing import Any
from neo4j import Driver
from neo4j.exceptions import ServiceUnavailable, SessionExpired


def persist_graph(
    driver: Driver,
    session_id: str,
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    user_id: str = "anonymous",  # AI-05: ownership field
) -> None:
    """
    Persists graph nodes and relationships to Neo4j (SEC-02, AI-01, AI-05).

    Security: ALL Cypher queries use $param syntax — zero string interpolation.
    Scope: All nodes/edges get session_id property for query isolation (CONTEXT.md).
    Ownership: created_by = user_id (Clerk user_id or "anonymous" for trial graphs).
    Pattern: Uses UNWIND for batch writes — single query per node/edge batch.

    Each node dict: {id, label, type, properties}
    Each edge dict: {source, target, relationship}
    """
    # Neo4j cannot store nested maps as properties — serialize to JSON string
    serialized_nodes = [
        {**n, "properties": json.dumps(n.get("properties") or {})}
        for n in nodes
    ]

    # Retry once on transient connection failures (Aura Free Tier wake-up).
    # The liveness_check_timeout on the driver handles most stale connections,
    # but a full ServiceUnavailable (instance waking up) needs a retry.
    max_attempts = 2
    for attempt in range(max_attempts):
        try:
            _persist_graph_inner(driver, session_id, serialized_nodes, edges, user_id)
            return
        except (ServiceUnavailable, SessionExpired, OSError):
            if attempt < max_attempts - 1:
                time.sleep(2)
            else:
                raise


def _persist_graph_inner(
    driver: Driver,
    session_id: str,
    serialized_nodes: list[dict],
    edges: list[dict],
    user_id: str,
) -> None:
    with driver.session() as session:
        # Persist nodes with created_by (AI-05) and created_at
        # NOTE: Entity label is constant (not user-supplied) so dynamic label is safe here.
        # The type property (Investor/Project/Round/Narrative/Person) is stored as a
        # property, not a label — avoids dynamic label injection entirely.
        session.run(
            """
            UNWIND $nodes AS node
            CREATE (n:Entity {
                id:         node.id,
                label:      node.label,
                type:       node.type,
                properties: node.properties,
                session_id: $session_id,
                created_by: $user_id,
                created_at: datetime()
            })
            """,
            nodes=serialized_nodes,
            session_id=session_id,
            user_id=user_id,  # parameterized — never interpolated
        )

        # Persist relationships — parameterized UNWIND batch insert
        # Relationship type is stored as a property, not a dynamic Cypher label,
        # to maintain strict parameterization (no apoc.create.relationship needed).
        session.run(
            """
            UNWIND $edges AS edge
            MATCH (s:Entity {id: edge.source, session_id: $session_id})
            MATCH (t:Entity {id: edge.target, session_id: $session_id})
            CREATE (s)-[r:RELATES_TO {
                type:       edge.relationship,
                session_id: $session_id
            }]->(t)
            """,
            edges=edges,
            session_id=session_id,
        )


def get_graph_by_session(driver: Driver, session_id: str) -> dict[str, list]:
    """
    Retrieves all nodes and relationships for a session_id.
    Used for the API response and for Phase 3 history retrieval.
    Fully parameterized — session_id passed as $session_id parameter.
    """
    max_attempts = 2
    for attempt in range(max_attempts):
        try:
            return _get_graph_by_session_inner(driver, session_id)
        except (ServiceUnavailable, SessionExpired, OSError):
            if attempt < max_attempts - 1:
                time.sleep(2)
            else:
                raise


def _get_graph_by_session_inner(driver: Driver, session_id: str) -> dict[str, list]:
    with driver.session() as session:
        # Fetch nodes
        node_result = session.run(
            """
            MATCH (n:Entity {session_id: $session_id})
            RETURN n.id AS id, n.label AS label, n.type AS type,
                   n.properties AS properties, n.session_id AS session_id
            """,
            session_id=session_id,
        )
        raw_nodes = [dict(record) for record in node_result]
        nodes = [
            {**n, "properties": json.loads(n["properties"]) if isinstance(n.get("properties"), str) else (n.get("properties") or {})}
            for n in raw_nodes
        ]

        # Fetch edges
        edge_result = session.run(
            """
            MATCH (s:Entity {session_id: $session_id})-[r:RELATES_TO]->(t:Entity)
            RETURN s.id AS source, t.id AS target, r.type AS relationship
            """,
            session_id=session_id,
        )
        edges = [dict(record) for record in edge_result]

    return {"nodes": nodes, "edges": edges}
