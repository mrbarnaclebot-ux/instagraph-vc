from fastapi import Request
from neo4j import Driver


def get_neo4j_driver(request: Request) -> Driver:
    """Returns the singleton Neo4j driver from app.state (SEC-04)."""
    return request.app.state.neo4j_driver


# get_current_user — implemented in Plan 04 (Clerk JWT validation)
