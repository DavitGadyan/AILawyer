from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Empty is allowed so the app still boots (and the non-AI half stays usable)
    # without a key; AI routes return 503 instead of crashing at import time.
    openai_api_key: str = ""
    openai_chat_model: str = "gpt-5.6-terra"
    openai_triage_model: str = "gpt-5.6-terra"
    openai_cheap_model: str = "gpt-5.6-luna"

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 20160  # 14 days

    database_url: str = "sqlite:///./ailawyer.db"
    cors_origins: str = "http://localhost:8081,http://localhost:19006,http://localhost:5173"

    admin_email: str = "admin@ailawyer.app"
    admin_password: str = "admin12345"

    # Per-user chat cap, enforced in-process (see services.rate_limit).
    chat_rate_limit_per_hour: int = 60

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def ai_enabled(self) -> bool:
        return bool(self.openai_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
