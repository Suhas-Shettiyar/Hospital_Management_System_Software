"""Application configuration, loaded from environment / .env file."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MedCore HMS"
    app_version: str = "0.1.0"
    cors_origins: str = "http://localhost:5173"
    database_url: str = "postgresql+psycopg://postgres:CHANGE_ME@localhost:5432/hms"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
