from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_username: str = "neo4j"
    neo4j_password: str
    clerk_secret_key: str = ""
    clerk_authorized_party: str = ""
    clerk_frontend_api: str = ""
    # Dev-only: skip Clerk JWT validation. Never set in production.
    dev_skip_auth: bool = False
    # Observability (Phase 5)
    sentry_dsn: str = ""
    environment: str = "development"

    model_config = {"env_file": ".env"}


settings = Settings()
