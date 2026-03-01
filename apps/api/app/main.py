import sentry_sdk
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.fastapi import FastApiIntegration
from contextlib import asynccontextmanager
from fastapi import FastAPI
from neo4j import GraphDatabase
from supabase import create_client
from upstash_redis import Redis
from app.config import settings
from app.generate.router import router as generate_router
from app.ratelimit.router import router as ratelimit_router

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
    # Aura Free Tier idles after inactivity → stale connections.
    # liveness_check_timeout keeps the pool healthy by probing before use.
    app.state.neo4j_driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_username, settings.neo4j_password),
        max_connection_pool_size=10,
        connection_acquisition_timeout=30,
        liveness_check_timeout=5,
    )
    app.state.neo4j_driver.verify_connectivity()
    # Create session_id index on startup (idempotent)
    with app.state.neo4j_driver.session() as session:
        session.run(
            "CREATE INDEX entity_session_id IF NOT EXISTS "
            "FOR (n:Entity) ON (n.session_id)"
        )

    # Supabase singleton (AUTH-03, AUTH-04) — only init if configured
    if settings.supabase_url and settings.supabase_key:
        app.state.supabase = create_client(settings.supabase_url, settings.supabase_key)
    else:
        app.state.supabase = None  # Graceful degradation when not configured

    # Upstash Redis singleton (RATE-01, RATE-03, AI-02)
    if settings.upstash_redis_rest_url and settings.upstash_redis_rest_token:
        app.state.redis = Redis(url=settings.upstash_redis_rest_url, token=settings.upstash_redis_rest_token)
    else:
        app.state.redis = None  # Graceful degradation when not configured

    yield
    # Shutdown — always close in neo4j 5.x (mandatory in 6.x)
    app.state.neo4j_driver.close()


app = FastAPI(
    title="GraphVC API",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(generate_router)
app.include_router(ratelimit_router)


@app.get("/health")
async def health():
    try:
        app.state.neo4j_driver.verify_connectivity()
        neo4j = "ok"
    except Exception:
        neo4j = "unavailable"
    return {"status": "ok" if neo4j == "ok" else "degraded", "neo4j": neo4j}
