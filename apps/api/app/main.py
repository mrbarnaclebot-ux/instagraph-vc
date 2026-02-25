from contextlib import asynccontextmanager
from fastapi import FastAPI
from neo4j import GraphDatabase
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — create driver singleton (SEC-04)
    app.state.neo4j_driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_username, settings.neo4j_password),
    )
    app.state.neo4j_driver.verify_connectivity()
    # Create session_id index on startup (idempotent)
    with app.state.neo4j_driver.session() as session:
        session.run(
            "CREATE INDEX entity_session_id IF NOT EXISTS "
            "FOR (n:Entity) ON (n.session_id)"
        )
    yield
    # Shutdown — always close in neo4j 5.x (mandatory in 6.x)
    app.state.neo4j_driver.close()


app = FastAPI(
    title="GraphVC API",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {"status": "ok"}
