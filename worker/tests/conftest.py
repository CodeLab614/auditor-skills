"""Pytest configuration, fixtures, and database test helpers."""

import os
from collections.abc import Generator

import psycopg
import pytest


@pytest.fixture
def db_conn() -> Generator[psycopg.Connection]:
    """Provide a clean database connection for tests marked with db."""
    url = os.environ.get("WORKER_TEST_DATABASE_URL")
    if not url:
        pytest.skip("WORKER_TEST_DATABASE_URL no está configurada")

    conn = psycopg.connect(url, autocommit=True)
    with conn.cursor() as cur:
        cur.execute(
            """
            TRUNCATE "finding", "version_file", "analysis_job", "skill_version", "skill", "blocked_repository"
            CASCADE;
            """
        )

    yield conn

    conn.close()
