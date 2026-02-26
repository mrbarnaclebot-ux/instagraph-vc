import sentry_sdk
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.fastapi import FastApiIntegration
from contextlib import asynccontextmanager
from fastapi import FastAPI
from neo4j import GraphDatabase
from app.config import settings
from app.generate.router import router as generate_router

# Sentry must be initialized before app = FastAPI() — patches request handling at import time
# Only init if DSN is configured (allows dev without Sentry credentials)
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.1,
        send_default_pii=True,
        environment=settings.environment,
        integrations=[
            StarletteIntegration(),
            FastApiIntegration(),
        ],
    )


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

app.include_router(generate_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
