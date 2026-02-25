from typing import Any
from neo4j import Driver


def persist_graph(
    driver: Driver,
    session_id: str,
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
) -> None:
    """
    Persists graph nodes and relationships to Neo4j (SEC-02, AI-01).

    Security: ALL Cypher queries use $param syntax — zero string interpolation.
    Scope: All nodes/edges get session_id property for query isolation (CONTEXT.md).
    Pattern: Uses UNWIND for batch writes — single query per node/edge batch.

    Each node dict: {id, label, type, properties}
    Each edge dict: {source, target, relationship}
    """
    with driver.session() as session:
        # Persist nodes — parameterized UNWIND batch insert
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
                session_id: $session_id
            })
            """,
            nodes=nodes,
            session_id=session_id,
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
        nodes = [dict(record) for record in node_result]

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
