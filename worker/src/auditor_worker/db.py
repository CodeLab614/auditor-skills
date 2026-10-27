"""Database access layer for the skill auditor worker."""

import json
import uuid
from dataclasses import dataclass

import psycopg

from auditor_worker.errors import AnalysisFailure
from auditor_worker.snapshot import TreeEntry


def new_id() -> str:
    """Generate a hex UUID for database records."""
    return uuid.uuid4().hex


@dataclass(frozen=True)
class ClaimedJob:
    id: str
    kind: str
    attempts: int
    version_id: str
    skill_id: str
    owner: str
    repo: str
    skill_path: str
    commit_sha: str
    source_files: list[TreeEntry]
    user_id: str | None
    display_owner: str
    display_repo: str
    skill_name: str
    submitted_ref: str


def _parse_source_files(raw: object) -> list[TreeEntry]:
    if not raw:
        return []
    items = raw
    if isinstance(raw, str):
        try:
            items = json.loads(raw)
        except Exception:
            return []
    if not isinstance(items, list):
        return []

    entries: list[TreeEntry] = []
    for item in items:
        if isinstance(item, dict):
            size_val = item.get("size")
            entries.append(
                TreeEntry(
                    path=str(item.get("path", "")),
                    type=str(item.get("type", "blob")),
                    sha=str(item.get("sha", "")),
                    size=int(size_val) if size_val is not None else None,
                    mode=str(item.get("mode", "100644")),
                )
            )
    return entries


def claim_job(conn: psycopg.Connection, stale_after_seconds: int = 600) -> ClaimedJob | None:
    """Claim the oldest queued or stale running job using FOR UPDATE SKIP LOCKED."""
    with conn.transaction(), conn.cursor() as cur:
        cur.execute(
            """
            UPDATE "analysis_job"
            SET "status" = 'running'::"AnalysisJobStatus",
                "attempts" = "attempts" + 1,
                "startedAt" = COALESCE("startedAt", (now() AT TIME ZONE 'UTC')),
                "heartbeatAt" = (now() AT TIME ZONE 'UTC')
            WHERE "id" = (
                SELECT "id"
                FROM "analysis_job"
                WHERE "status" = 'queued'::"AnalysisJobStatus"
                   OR (
                       "status" = 'running'::"AnalysisJobStatus"
                       AND (
                           "heartbeatAt" IS NULL
                           OR "heartbeatAt" < ((now() AT TIME ZONE 'UTC') - (%s::int * INTERVAL '1 second'))
                       )
                   )
                ORDER BY "createdAt" ASC
                FOR UPDATE SKIP LOCKED
                LIMIT 1
            )
            RETURNING "id", "kind", "attempts", "versionId", "userId"
            """,
            (stale_after_seconds,),
        )
        job_row = cur.fetchone()
        if job_row is None:
            return None

        job_id, kind, attempts, version_id, user_id = job_row

        cur.execute(
            """
            SELECT
                v."skillId",
                v."commitSha",
                v."sourceFiles",
                s."owner",
                s."repo",
                s."path",
                COALESCE(s."displayOwner", s."owner"),
                COALESCE(s."displayRepo", s."repo"),
                s."name",
                v."submittedRef"
            FROM "skill_version" v
            JOIN "skill" s ON s."id" = v."skillId"
            WHERE v."id" = %s
            """,
            (version_id,),
        )
        detail_row = cur.fetchone()
        if detail_row is None:
            raise AnalysisFailure("No se encontró la versión o skill para el trabajo analizado")

        (
            skill_id,
            commit_sha,
            source_files_raw,
            owner,
            repo,
            skill_path,
            display_owner,
            display_repo,
            skill_name,
            submitted_ref,
        ) = detail_row

        return ClaimedJob(
            id=str(job_id),
            kind=str(kind),
            attempts=int(attempts),
            version_id=str(version_id),
            skill_id=str(skill_id),
            owner=str(owner),
            repo=str(repo),
            skill_path=str(skill_path),
            commit_sha=str(commit_sha),
            source_files=_parse_source_files(source_files_raw),
            user_id=str(user_id) if user_id is not None else None,
            display_owner=str(display_owner),
            display_repo=str(display_repo),
            skill_name=str(skill_name),
            submitted_ref=str(submitted_ref),
        )


def report_progress(
    conn: psycopg.Connection,
    job_id: str,
    step: str,
    current: int | None = None,
    total: int | None = None,
) -> None:
    """Update job step, progress counters, and heartbeat."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE "analysis_job"
            SET "step" = %s,
                "progressCurrent" = %s,
                "progressTotal" = %s,
                "heartbeatAt" = (now() AT TIME ZONE 'UTC')
            WHERE "id" = %s
            """,
            (step, current, total, job_id),
        )


def fail_job(conn: psycopg.Connection, job_id: str, reason: str) -> None:
    """Mark a job as failed, record finishedAt, and return credit if applicable."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE "analysis_job"
            SET "status" = 'failed'::"AnalysisJobStatus",
                "failureReason" = %s,
                "finishedAt" = (now() AT TIME ZONE 'UTC'),
                "creditReturnedAt" = CASE
                    WHEN "creditMonth" IS NOT NULL THEN (now() AT TIME ZONE 'UTC')
                    ELSE NULL
                END
            WHERE "id" = %s
            """,
            (reason, job_id),
        )


def requeue_job(conn: psycopg.Connection, job_id: str) -> None:
    """Requeue a job after a transient error."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE "analysis_job"
            SET "status" = 'queued'::"AnalysisJobStatus",
                "heartbeatAt" = NULL
            WHERE "id" = %s
            """,
            (job_id,),
        )


def remote_urls(conn: psycopg.Connection, version_id: str) -> list[str]:
    """Retrieve remote URLs from version_file for origin=remote sorted by path."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT "remoteUrl"
            FROM "version_file"
            WHERE "versionId" = %s
              AND "origin" = 'remote'::"FileOrigin"
              AND "remoteUrl" IS NOT NULL
            ORDER BY "path" ASC
            """,
            (version_id,),
        )
        return [str(row[0]) for row in cur.fetchall()]


def find_analyzed_version(conn: psycopg.Connection, skill_id: str, fingerprint: str) -> str | None:
    """Find the analyzed version for a skill matching the given fingerprint."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT "id"
            FROM "skill_version"
            WHERE "skillId" = %s
              AND "fingerprint" = %s
              AND "verdict" IS NOT NULL
            LIMIT 1
            """,
            (skill_id, fingerprint),
        )
        row = cur.fetchone()
        return str(row[0]) if row is not None else None


def complete_with_existing(conn: psycopg.Connection, job_id: str, version_id: str) -> None:
    """Complete a job pointing to an existing version, returning credit if applicable."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE "analysis_job"
            SET "versionId" = %s,
                "status" = 'done'::"AnalysisJobStatus",
                "step" = NULL,
                "finishedAt" = (now() AT TIME ZONE 'UTC'),
                "creditReturnedAt" = CASE
                    WHEN "creditMonth" IS NOT NULL THEN (now() AT TIME ZONE 'UTC')
                    ELSE NULL
                END
            WHERE "id" = %s
            """,
            (version_id, job_id),
        )


def create_version_from(conn: psycopg.Connection, version_id: str, user_id: str | None) -> str:
    """Insert a new skill_version cloning metadata from an existing version."""
    new_version_id = new_id()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "skill_version" (
                "id", "skillId", "commitSha", "submittedRef", "filesFingerprint",
                "sourceFiles", "submittedById", "fingerprint", "hasRemoteScripts", "createdAt"
            )
            SELECT
                %s, "skillId", "commitSha", "submittedRef", "filesFingerprint",
                "sourceFiles", %s, NULL, true, (now() AT TIME ZONE 'UTC')
            FROM "skill_version"
            WHERE "id" = %s
            """,
            (new_version_id, user_id, version_id),
        )
    return new_version_id


def convert_to_analysis(conn: psycopg.Connection, job_id: str, version_id: str) -> None:
    """Convert a fingerprint_check job to an analysis job pointing to the new version."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE "analysis_job"
            SET "versionId" = %s,
                "kind" = 'analysis'::"AnalysisJobKind"
            WHERE "id" = %s
            """,
            (version_id, job_id),
        )


__all__ = [
    "ClaimedJob",
    "claim_job",
    "complete_with_existing",
    "convert_to_analysis",
    "create_version_from",
    "fail_job",
    "find_analyzed_version",
    "new_id",
    "remote_urls",
    "report_progress",
    "requeue_job",
]
