from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Kerma API"
    sources_dir: Path = Field(default=Path("/data/sources"))
    editions_dir: Path = Field(default=Path("/data/editions"))
    config_dir: Path = Field(default=Path("/data/config"))
    scan_interval_seconds: int = Field(default=30, ge=5)
    cors_origins: list[str] = Field(default_factory=lambda: ["*"])
    auth_cookie_name: str = "kerma_session"
    auth_session_secret: str = "change-me-in-production"
    auth_session_ttl_hours: int = Field(default=12, ge=1)
    bootstrap_admin_login: str | None = None
    bootstrap_admin_password: str | None = None
    bootstrap_admin_role: str = "admin"
    sso_enabled: bool = False
    sso_login_url: str | None = None
    sso_logout_url: str | None = None
    sso_return_to_param: str = "return_to"
    sso_user_header: str = "X-Forwarded-User"
    sso_role_header: str = "X-Forwarded-Role"
    sso_default_role: str = "user"
    sso_auto_create_users: bool = True

    model_config = SettingsConfigDict(
        env_prefix="KERMA_",
        env_file=".env",
        env_file_encoding="utf-8",
    )

    def ensure_directories(self) -> None:
        self.sources_dir.mkdir(parents=True, exist_ok=True)
        self.editions_dir.mkdir(parents=True, exist_ok=True)
        self.config_dir.mkdir(parents=True, exist_ok=True)

    @property
    def database_path(self) -> Path:
        return self.config_dir / "kerma.sqlite3"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.ensure_directories()
    return settings
