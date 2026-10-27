"""Database tests for job claiming, progress reporting, and queue semantics."""

import os
import threading

import psycopg
import pytest

from auditor_worker.__main__ import handle_claimed_job
from auditor_worker.config import Config
from auditor_worker.db import claim_job, fail_job
from auditor_worker.snapshot import TreeEntry
from tests.factories import insert_job, insert_skill, insert_version

pytestmark = pytest.mark.db


def test_two_connections_only_one_claims(db_conn: psycopg.Connection) -> None:
    """With two concurrent connections and one queued job, only one connection claims it."""
    url = os.environ.get("WORKER_TEST_DATABASE_URL")
    assert url is not None

    conn2 = psycopg.connect(url, autocommit=True)
    try:
        skill_id = insert_skill(db_conn, slug="concurrent-skill")
        version_id = insert_version(db_conn, skill_id=skill_id)
        insert_job(db_conn, version_id=version_id)

        results: list[object] = []
        barrier = threading.Barrier(2)

        def worker_claim(conn: psycopg.Connection) -> None:
            barrier.wait()
            job = claim_job(conn, stale_after_seconds=600)
            results.append(job)

        t1 = threading.Thread(target=worker_claim, args=(db_conn,))
        t2 = threading.Thread(target=worker_claim, args=(conn2,))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        claimed = [r for r in results if r is not None]
        unclaimed = [r for r in results if r is None]

        assert len(claimed) == 1
        assert len(unclaimed) == 1
    finally:
        conn2.close()


def test_stale_job_reclaimed(db_conn: psycopg.Connection) -> None:
    """A running job with heartbeat older than stale_after_seconds is reclaimed; recent is not."""
    skill_id = insert_skill(db_conn, slug="stale-test-skill")
    version_id = insert_version(db_conn, skill_id=skill_id)

    job1_id = insert_job(db_conn, version_id=version_id, status="running", attempts=1, heartbeat_minutes_ago=11)
    insert_job(db_conn, version_id=version_id, status="running", attempts=1, heartbeat_minutes_ago=1)

    claimed = claim_job(db_conn, stale_after_seconds=600)

    assert claimed is not None
    assert claimed.id == job1_id

    next_claimed = claim_job(db_conn, stale_after_seconds=600)

    assert next_claimed is None


def test_fail_job_credit_month(db_conn: psycopg.Connection) -> None:
    """fail_job sets creditReturnedAt when creditMonth is present; leaves it null otherwise."""
    skill_id = insert_skill(db_conn, slug="credit-test-skill")
    version_id = insert_version(db_conn, skill_id=skill_id)

    job_with_credit = insert_job(db_conn, version_id=version_id, credit_month="2026-10")
    job_without_credit = insert_job(db_conn, version_id=version_id, credit_month=None)

    fail_job(db_conn, job_with_credit, "Failed with credit")
    fail_job(db_conn, job_without_credit, "Failed without credit")

    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT "id", "status", "failureReason", "finishedAt", "creditReturnedAt"
            FROM "analysis_job"
            WHERE "id" IN (%s, %s)
            ORDER BY "createdAt" ASC
            """,
            (job_with_credit, job_without_credit),
        )
        rows = cur.fetchall()

    assert len(rows) == 2
    row_credit = [r for r in rows if r[0] == job_with_credit][0]
    row_no_credit = [r for r in rows if r[0] == job_without_credit][0]

    assert row_credit[1] == "failed"
    assert row_credit[2] == "Failed with credit"
    assert row_credit[3] is not None
    assert row_credit[4] is not None

    assert row_no_credit[1] == "failed"
    assert row_no_credit[2] == "Failed without credit"
    assert row_no_credit[3] is not None
    assert row_no_credit[4] is None


def test_exhausted_attempts_fail(db_conn: psycopg.Connection) -> None:
    """A job claimed for the 4th time with max_attempts=3 fails with 'Se agotaron los intentos'."""
    skill_id = insert_skill(db_conn, slug="exhausted-attempts-skill")
    version_id = insert_version(db_conn, skill_id=skill_id)
    job_id = insert_job(db_conn, version_id=version_id, attempts=3, credit_month="2026-10")

    claimed = claim_job(db_conn, stale_after_seconds=600)

    assert claimed is not None
    assert claimed.id == job_id
    assert claimed.attempts == 4

    config = Config(
        database_url=os.environ.get("WORKER_TEST_DATABASE_URL", ""),
        github_token=None,
        poll_seconds=3,
        max_attempts=3,
    )
    handle_claimed_job(db_conn, claimed, config)

    with db_conn.cursor() as cur:
        cur.execute(
            'SELECT "status", "failureReason", "creditReturnedAt", "finishedAt" FROM "analysis_job" WHERE "id" = %s',
            (job_id,),
        )
        row = cur.fetchone()

    assert row is not None
    assert row[0] == "failed"
    assert row[1] == "Se agotaron los intentos"
    assert row[2] is not None
    assert row[3] is not None


def test_claim_job_source_files_tree_entry(db_conn: psycopg.Connection) -> None:
    """claim_job converts sourceFiles JSON into TreeEntry dataclass instances and reads skill columns."""
    skill_id = insert_skill(
        db_conn,
        owner="test-owner",
        repo="test-repo",
        path="skills/scanner",
        name="Scanner Skill",
        slug="scanner-skill",
    )
    source_files_data = [
        {
            "path": "SKILL.md",
            "type": "blob",
            "sha": "1111222233334444555566667777888899990000",
            "size": 128,
            "mode": "100644",
        },
        {
            "path": "run.sh",
            "type": "blob",
            "sha": "aaaabbbbccccddddeeeeffff0000111122223333",
            "size": 256,
            "mode": "100755",
        },
    ]
    version_id = insert_version(
        db_conn,
        skill_id=skill_id,
        commit_sha="fedcba9876543210fedcba9876543210fedcba98",
        source_files=source_files_data,
    )
    job_id = insert_job(db_conn, version_id=version_id)

    claimed = claim_job(db_conn, stale_after_seconds=600)

    assert claimed is not None
    assert claimed.id == job_id
    assert claimed.owner == "test-owner"
    assert claimed.repo == "test-repo"
    assert claimed.skill_path == "skills/scanner"
    assert claimed.commit_sha == "fedcba9876543210fedcba9876543210fedcba98"
    assert len(claimed.source_files) == 2

    first = claimed.source_files[0]
    assert isinstance(first, TreeEntry)
    assert first.path == "SKILL.md"
    assert first.type == "blob"
    assert first.sha == "1111222233334444555566667777888899990000"
    assert first.size == 128
    assert first.mode == "100644"

    second = claimed.source_files[1]
    assert isinstance(second, TreeEntry)
    assert second.path == "run.sh"
    assert second.type == "blob"
    assert second.sha == "aaaabbbbccccddddeeeeffff0000111122223333"
    assert second.size == 256
    assert second.mode == "100755"
