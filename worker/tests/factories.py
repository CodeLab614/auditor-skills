"""Database test factories for skill auditor worker tests."""

import json

import psycopg
from psycopg.types.json import Jsonb

from auditor_worker.db import new_id


def insert_skill(
    conn: psycopg.Connection,
    *,
    owner: str = "test-owner",
    repo: str = "test-repo",
    display_owner: str | None = None,
    display_repo: str | None = None,
    path: str = "",
    name: str = "Test Skill",
    slug: str = "test-skill",
    description: str = "Skill description",
) -> str:
    """Helper to insert a test skill."""
    skill_id = new_id()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "skill" (
                "id", "owner", "repo", "displayOwner", "displayRepo",
                "path", "name", "description", "slug", "createdAt"
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, (now() AT TIME ZONE 'UTC'))
            """,
            (skill_id, owner, repo, display_owner, display_repo, path, name, description, slug),
        )
    if not conn.autocommit:
        conn.commit()
    return skill_id


def insert_version(
    conn: psycopg.Connection,
    *,
    skill_id: str,
    commit_sha: str = "0123456789abcdef0123456789abcdef01234567",
    ref: str = "main",
    files_fingerprint: str = "fp_test",
    fingerprint: str | None = None,
    has_remote_scripts: bool = False,
    source_files: list[dict] | None = None,
    verdict: str | None = None,
    report: dict | None = None,
) -> str:
    """Helper to insert a test skill version."""
    version_id = new_id()
    files_json = json.dumps(source_files or [])
    report_json = Jsonb(report) if report is not None else None
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "skill_version" (
                "id", "skillId", "commitSha", "submittedRef", "filesFingerprint",
                "fingerprint", "hasRemoteScripts", "sourceFiles", "verdict",
                "report", "analyzedAt", "createdAt"
            )
            VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s::jsonb, %s::"Verdict",
                %s,
                CASE WHEN %s::text IS NOT NULL THEN (now() AT TIME ZONE 'UTC') ELSE NULL END,
                (now() AT TIME ZONE 'UTC')
            )
            """,
            (
                version_id,
                skill_id,
                commit_sha,
                ref,
                files_fingerprint,
                fingerprint,
                has_remote_scripts,
                files_json,
                verdict,
                report_json,
                verdict,
            ),
        )
    if not conn.autocommit:
        conn.commit()
    return version_id


def insert_job(
    conn: psycopg.Connection,
    *,
    version_id: str,
    kind: str = "analysis",
    status: str = "queued",
    attempts: int = 0,
    credit_month: str | None = None,
    user_id: str | None = None,
    heartbeat_minutes_ago: int | None = None,
) -> str:
    """Helper to insert a test analysis job."""
    job_id = new_id()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "analysis_job" (
                "id", "versionId", "kind", "status", "attempts", "creditMonth", "userId", "heartbeatAt", "createdAt"
            )
            VALUES (
                %s, %s, %s::"AnalysisJobKind", %s::"AnalysisJobStatus", %s, %s, %s,
                CASE
                    WHEN %s::int IS NULL THEN NULL
                    ELSE (now() AT TIME ZONE 'UTC') - (%s::int * INTERVAL '1 minute')
                END,
                (now() AT TIME ZONE 'UTC')
            )
            """,
            (
                job_id,
                version_id,
                kind,
                status,
                attempts,
                credit_month,
                user_id,
                heartbeat_minutes_ago,
                heartbeat_minutes_ago,
            ),
        )
    if not conn.autocommit:
        conn.commit()
    return job_id


__all__ = ["insert_job", "insert_skill", "insert_version"]
