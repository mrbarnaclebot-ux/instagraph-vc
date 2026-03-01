from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str
    openai_model: str = "gpt-4o"
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_username: str = "neo4j"
    neo4j_password: str
    clerk_secret_key: str = ""
    clerk_authorized_party: str = ""
    clerk_frontend_api: str = ""
    # Dev-only: skip Clerk JWT validation. Never set in production.
    dev_skip_auth: bool = False
    # Supabase (Phase 3 — AUTH-03, AUTH-04)
    supabase_url: str = ""
    supabase_key: str = ""  # sb_secret_... or service_role key (server-side only, never anon)
    # Upstash Redis (Phase 4 — RATE-01, RATE-03, AI-02)
    upstash_redis_rest_url: str = ""
    upstash_redis_rest_token: str = ""
    # Observability (Phase 5)
    sentry_dsn: str = ""
    environment: str = "development"

    model_config = {"env_file": ".env"}


settings = Settings()

# Hard guard: refuse to start if dev auth bypass is enabled outside development
if settings.dev_skip_auth and settings.environment != "development":
    raise RuntimeError(
        "FATAL: DEV_SKIP_AUTH=true is set in a non-development environment "
        f"(ENVIRONMENT={settings.environment!r}). This bypasses all authentication. "
        "Remove DEV_SKIP_AUTH or set ENVIRONMENT=development."
    )
