"""Persistence layer for analysis results, files, findings, and version status."""

from typing import TYPE_CHECKING

import psycopg
from psycopg.errors import UniqueViolation
from psycopg.types.json import Jsonb

from auditor_worker.db import ClaimedJob, complete_with_existing, new_id
from auditor_worker.errors import AnalysisFailure

if TYPE_CHECKING:
    from auditor_worker.pipeline import AnalysisResult


def refresh_skill_latest(cur: psycopg.Cursor, version_id: str) -> None:
    """Refresh the skill's cached latest analysis columns for the given version."""
    cur.execute(
        """
        UPDATE "skill" s
        SET ("latestVersionId", "latestVerdict", "latestAnalyzedAt", "latestHasRemoteScripts", "latestWarningCount") = (
          SELECT v."id", v."verdict", v."analyzedAt", v."hasRemoteScripts",
                 (SELECT count(*) FROM "finding" f WHERE f."versionId" = v."id")::int
          FROM "skill_version" v
          WHERE v."skillId" = s."id" AND v."verdict" IS NOT NULL AND v."analyzedAt" IS NOT NULL
          ORDER BY v."analyzedAt" DESC, v."id" DESC
          LIMIT 1
        )
        WHERE s."id" = (SELECT "skillId" FROM "skill_version" WHERE "id" = %s)
        """,
        (version_id,),
    )


def save_analysis(
    conn: psycopg.Connection,
    job: ClaimedJob,
    version_id: str,
    result: AnalysisResult,
    *,
    created_version: bool,
) -> None:
    """Save analysis result, files, and findings in a single atomic transaction.

    Handles concurrent fingerprint conflicts by deduplicating against the existing version.
    """
    try:
        with conn.transaction():
            with conn.cursor() as cur:
                # 1. Clean previous findings and files for retries
                cur.execute('DELETE FROM "finding" WHERE "versionId" = %s', (version_id,))
                cur.execute('DELETE FROM "version_file" WHERE "versionId" = %s', (version_id,))

                # 2. Insert version_file records
                for f in result.files:
                    file_id = new_id()
                    cur.execute(
                        """
                        INSERT INTO "version_file" (
                            "id", "versionId", "path", "origin", "blobSha", "contentSha256",
                            "remoteUrl", "downloadedAt", "kind", "language", "lineCount",
                            "byteSize", "review", "flags"
                        )
                        VALUES (
                            %s, %s, %s, %s::"FileOrigin", %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s::"FileReview", %s::text[]
                        )
                        """,
                        (
                            file_id,
                            version_id,
                            f.path,
                            f.origin,
                            f.blob_sha,
                            f.content_sha256,
                            f.remote_url,
                            f.downloaded_at,
                            f.kind,
                            f.language,
                            f.line_count,
                            f.byte_size,
                            f.review,
                            f.flags,
                        ),
                    )

                # 3. Insert finding records
                for find in result.findings:
                    finding_id = new_id()
                    cur.execute(
                        """
                        INSERT INTO "finding" (
                            "id", "versionId", "ruleId", "category", "severity", "declared",
                            "origin", "filePath", "line", "title", "evidence"
                        )
                        VALUES (
                            %s, %s, %s, %s, %s::"FindingSeverity", %s,
                            'rules', %s, %s, %s, %s
                        )
                        """,
                        (
                            finding_id,
                            version_id,
                            find.rule_id,
                            find.category,
                            find.severity or "low",
                            find.declared,
                            find.file_path,
                            find.line,
                            find.title,
                            find.evidence,
                        ),
                    )

                # 4. Update skill_version
                cur.execute(
                    """
                    UPDATE "skill_version"
                    SET "verdict" = %s::"Verdict",
                        "analyzedAt" = (now() AT TIME ZONE 'UTC'),
                        "report" = %s,
                        "fingerprint" = %s,
                        "hasRemoteScripts" = %s
                    WHERE "id" = %s
                    """,
                    (
                        result.verdict,
                        Jsonb(result.report),
                        result.fingerprint,
                        result.has_remote_scripts,
                        version_id,
                    ),
                )

                # 5. Refresh the skill's latest analysis
                refresh_skill_latest(cur, version_id)

                # 6. Mark job as done
                cur.execute(
                    """
                    UPDATE "analysis_job"
                    SET "status" = 'done'::"AnalysisJobStatus",
                        "finishedAt" = (now() AT TIME ZONE 'UTC'),
                        "step" = NULL
                    WHERE "id" = %s
                    """,
                    (job.id,),
                )
    except UniqueViolation:
        # Resolve concurrent conflict in a separate transaction
        with conn.transaction(), conn.cursor() as cur:
            cur.execute(
                """
                SELECT "id"
                FROM "skill_version"
                WHERE "skillId" = %s AND "fingerprint" = %s
                ORDER BY CASE WHEN "verdict" IS NOT NULL THEN 0 ELSE 1 END
                LIMIT 1
                """,
                (job.skill_id, result.fingerprint),
            )
            winner_row = cur.fetchone()
            if winner_row is None:
                raise AnalysisFailure("Error de concurrencia al resolver la huella de la versión") from None
            winner_id = str(winner_row[0])

            cur.execute(
                """
                UPDATE "analysis_job"
                SET "versionId" = %s
                WHERE "versionId" = %s
                """,
                (winner_id, version_id),
            )

            if created_version:
                cur.execute('DELETE FROM "skill_version" WHERE "id" = %s', (version_id,))

            complete_with_existing(conn, job.id, winner_id)


__all__ = ["save_analysis"]
