"""Unit tests for worker configuration."""

import pytest

from auditor_worker.config import ConfigError, load_config


def test_default_config() -> None:
    env = {"DATABASE_URL": "postgresql://user:pass@localhost:5432/db?sslmode=disable"}
    cfg = load_config(env)

    assert cfg.database_url == "postgresql://user:pass@localhost:5432/db?sslmode=disable"
    assert cfg.github_token is None
    assert cfg.poll_seconds == 3
    assert cfg.max_attempts == 3
    assert cfg.stale_after_seconds == 600


def test_custom_config() -> None:
    env = {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/db",
        "GITHUB_TOKEN": "ghp_mock_token_12345",
        "WORKER_POLL_SECONDS": "5",
        "WORKER_MAX_ATTEMPTS": "7",
    }
    cfg = load_config(env)

    assert cfg.github_token == "ghp_mock_token_12345"
    assert cfg.poll_seconds == 5
    assert cfg.max_attempts == 7
    assert cfg.stale_after_seconds == 600


def test_invalid_poll_seconds() -> None:
    env = {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/db",
        "WORKER_POLL_SECONDS": "abc",
    }
    with pytest.raises(ConfigError):
        load_config(env)

    env_negative = {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/db",
        "WORKER_POLL_SECONDS": "-2",
    }
    with pytest.raises(ConfigError):
        load_config(env_negative)


def test_invalid_max_attempts() -> None:
    env = {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/db",
        "WORKER_MAX_ATTEMPTS": "abc",
    }
    with pytest.raises(ConfigError):
        load_config(env)

    env_zero = {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/db",
        "WORKER_MAX_ATTEMPTS": "0",
    }
    with pytest.raises(ConfigError):
        load_config(env_zero)


def test_missing_database_url() -> None:
    with pytest.raises(ConfigError):
        load_config({})


def test_empty_database_url() -> None:
    with pytest.raises(ConfigError):
        load_config({"DATABASE_URL": "   "})
