"""Worker configuration loading and validation."""

import os
from collections.abc import Mapping
from dataclasses import dataclass

from auditor_worker.errors import ConfigError


@dataclass(frozen=True)
class Config:
    database_url: str
    github_token: str | None
    poll_seconds: float
    max_attempts: int
    stale_after_seconds: int = 600


def load_config(env: Mapping[str, str] | None = None) -> Config:
    """Load and validate worker configuration from an environment mapping."""
    source = os.environ if env is None else env

    raw_db_url = source.get("DATABASE_URL", "").strip()
    if not raw_db_url:
        raise ConfigError("Falta la variable de entorno obligatoria DATABASE_URL")

    raw_token = source.get("GITHUB_TOKEN", "").strip()
    github_token = raw_token if raw_token else None

    raw_poll = source.get("WORKER_POLL_SECONDS", "3")
    try:
        try:
            poll_seconds: float = int(raw_poll)
        except ValueError:
            poll_seconds = float(raw_poll)
        if poll_seconds <= 0:
            raise ValueError
    except (ValueError, TypeError) as err:
        raise ConfigError(f"WORKER_POLL_SECONDS no es válido: {raw_poll}") from err

    raw_attempts = source.get("WORKER_MAX_ATTEMPTS", "3")
    try:
        max_attempts = int(raw_attempts)
        if max_attempts <= 0:
            raise ValueError
    except (ValueError, TypeError) as err:
        raise ConfigError(f"WORKER_MAX_ATTEMPTS no es válido: {raw_attempts}") from err

    return Config(
        database_url=raw_db_url,
        github_token=github_token,
        poll_seconds=poll_seconds,
        max_attempts=max_attempts,
        stale_after_seconds=600,
    )


__all__ = ["Config", "ConfigError", "load_config"]
