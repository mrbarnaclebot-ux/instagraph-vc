from fastapi import Request
from neo4j import Driver
from supabase import Client

from app.auth.clerk import get_current_user, get_optional_user  # noqa: F401 — re-exported for routers


def get_neo4j_driver(request: Request) -> Driver:
    """
    Returns the singleton Neo4j driver from app.state (SEC-04).
    The driver is created once in the lifespan context manager in main.py
    and stored in app.state.neo4j_driver. Never instantiate a new driver
    inside a route handler or dependency.
    """
    return request.app.state.neo4j_driver


def get_supabase_client(request: Request) -> Client | None:
    """Returns the singleton Supabase client from app.state (AUTH-03, AUTH-04).
    Returns None if Supabase is not configured (dev without credentials).
    Never create a new client inside a route handler."""
    return getattr(request.app.state, "supabase", None)


# Usage in protected routes:
#
#   from app.dependencies import get_neo4j_driver, get_current_user
#
#   @router.post("/api/generate")
#   async def generate(
#       body: GenerateRequest,
#       driver: Driver = Depends(get_neo4j_driver),
#       current_user: dict = Depends(get_current_user),
#   ):
#       user_id = current_user.get("sub")
