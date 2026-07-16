"""Application configuration, loaded from environment / .env file."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MedCore HMS"
    app_version: str = "0.1.0"
    cors_origins: str = "http://localhost:5173"
    database_url: str = "postgresql+psycopg://hms:CHANGE_ME@localhost:5433/hms"
    enabled_modules: str = "opd,appointments,lab,pharmacy,ipd"

    # --- Auth ---
    jwt_secret_key: str = "dev-insecure-jwt-secret-CHANGE-ME"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 600  # ~10h, matches a hospital staff shift

    # --- Outbound email (Brevo transactional API) ---
    brevo_api_key: str = ""  # empty => sending is skipped/logged, not attempted
    brevo_sender_email: str = "no-reply@medcore-hms.local"
    brevo_sender_name: str = "MedCore HMS"

    # Used to build reset/verify links that point at the frontend
    frontend_base_url: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def enabled_modules_list(self) -> list[str]:
        return [m.strip() for m in self.enabled_modules.split(",") if m.strip()]


settings = Settings()
