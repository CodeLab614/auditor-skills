"""Database tests for analysis saving, retry cleanup, fingerprint checking, and concurrency conflict resolution."""

import hashlib
import io
import tarfile
from datetime import UTC, datetime

import psycopg
import pytest

from auditor_worker import pipeline
from auditor_worker.db import claim_job, new_id
from auditor_worker.fetch import FetchResult
from auditor_worker.findings import Finding
from auditor_worker.fingerprint import final_fingerprint
from auditor_worker.osv import OsvResult
from auditor_worker.pipeline import (
    AnalysisResult,
    PipelineDeps,
    VersionFileRow,
)
from auditor_worker.remote import RemoteScript
from auditor_worker.snapshot import TreeEntry, git_blob_sha
from auditor_worker.store import save_analysis
from tests.factories import insert_job, insert_skill, insert_version

pytestmark = pytest.mark.db


def _make_tarball(files: dict[str, bytes], prefix: str = "test-repo-abc") -> io.BytesIO:
    bio = io.BytesIO()
    with tarfile.open(fileobj=bio, mode="w:gz") as tar:
        for name, data in files.items():
            ti = tarfile.TarInfo(name=f"{prefix}/{name}")
            ti.size = len(data)
            ti.type = tarfile.REGTYPE
            ti.mode = 0o644
            tar.addfile(ti, io.BytesIO(data))
    bio.seek(0)
    return bio


def test_store_saves_and_marks_done(db_conn: psycopg.Connection) -> None:
    """save_analysis inserts version_file, findings, updates skill_version, and marks job done."""
    skill_id = insert_skill(db_conn, slug="save-test-skill")
    version_id = insert_version(db_conn, skill_id=skill_id)
    job_id = insert_job(db_conn, version_id=version_id)
    job = claim_job(db_conn)
    assert job is not None

    finding = Finding(
        rule_id="net.http",
        category="network",
        severity_undeclared="high",
        severity_declared="medium",
        file_path="app.py",
        line=1,
        title="HTTP request",
        evidence="https://api.example.com",
        declared=True,
        severity="medium",
    )
    vfile = VersionFileRow(
        path="app.py",
        origin="skill",
        blob_sha="blob123",
        content_sha256="csha123",
        remote_url=None,
        downloaded_at=None,
        kind="code",
        language="python",
        line_count=5,
        byte_size=50,
        review="source",
        flags=[],
    )
    report_dict = {"schemaVersion": 1, "test": "ok"}

    result = AnalysisResult(
        verdict="no_serious_findings",
        top_finding=None,
        findings=[finding],
        files=[vfile],
        report=report_dict,
        fingerprint="fp_save_test",
        has_remote_scripts=False,
    )

    save_analysis(db_conn, job, version_id, result, created_version=False)

    with db_conn.cursor() as cur:
        # Check finding
        cur.execute(
            """
            SELECT "ruleId", "category", "severity", "declared", "origin", "filePath", "line", "title"
            FROM "finding"
            WHERE "versionId" = %s
            """,
            (version_id,),
        )
        finding_rows = cur.fetchall()
        assert len(finding_rows) == 1
        assert finding_rows[0] == (
            "net.http",
            "network",
            "medium",
            True,
            "rules",
            "app.py",
            1,
            "HTTP request",
        )

        # Check version_file
        cur.execute(
            """
            SELECT "path", "origin", "blobSha", "contentSha256", "kind", "language", "lineCount", "byteSize", "review"
            FROM "version_file"
            WHERE "versionId" = %s
            """,
            (version_id,),
        )
        file_rows = cur.fetchall()
        assert len(file_rows) == 1
        assert file_rows[0] == (
            "app.py",
            "skill",
            "blob123",
            "csha123",
            "code",
            "python",
            5,
            50,
            "source",
        )

        # Check skill_version
        cur.execute(
            """
            SELECT "verdict", "fingerprint", "hasRemoteScripts", "report", "analyzedAt"
            FROM "skill_version"
            WHERE "id" = %s
            """,
            (version_id,),
        )
        ver_row = cur.fetchone()
        assert ver_row is not None
        assert ver_row[0] == "no_serious_findings"
        assert ver_row[1] == "fp_save_test"
        assert ver_row[2] is False
        assert ver_row[3] == report_dict
        assert ver_row[4] is not None

        # Check analysis_job
        cur.execute(
            """
            SELECT "status", "finishedAt", "step"
            FROM "analysis_job"
            WHERE "id" = %s
            """,
            (job_id,),
        )
        job_row = cur.fetchone()
        assert job_row is not None
        assert job_row[0] == "done"
        assert job_row[1] is not None
        assert job_row[2] is None


def test_store_retry_replaces_previous_rows(db_conn: psycopg.Connection) -> None:
    """save_analysis deletes existing finding and version_file rows before re-inserting."""
    skill_id = insert_skill(db_conn, slug="retry-test-skill")
    version_id = insert_version(db_conn, skill_id=skill_id)
    insert_job(db_conn, version_id=version_id)
    job = claim_job(db_conn)
    assert job is not None

    f1 = Finding("net.http", "network", "high", "medium", "f1.py", 1, "t1", "e1", True, "medium")
    f2 = Finding("secrets.path", "secrets", "high", "high", "f2.py", 2, "t2", "e2", False, "high")
    vf1 = VersionFileRow("f1.py", "skill", "s1", "cs1", None, None, "code", "python", 1, 10, "source", [])
    vf2 = VersionFileRow("f2.py", "skill", "s2", "cs2", None, None, "code", "python", 2, 20, "source", [])

    res1 = AnalysisResult("review", None, [f1, f2], [vf1, vf2], {"schemaVersion": 1}, "fp1", False)
    save_analysis(db_conn, job, version_id, res1, created_version=False)

    with db_conn.cursor() as cur:
        cur.execute('SELECT COUNT(*) FROM "finding" WHERE "versionId" = %s', (version_id,))
        assert cur.fetchone()[0] == 2
        cur.execute('SELECT COUNT(*) FROM "version_file" WHERE "versionId" = %s', (version_id,))
        assert cur.fetchone()[0] == 2

    # Run retry with only 1 finding and 1 file
    f3 = Finding("exec.dynamic", "execution", "medium", "medium", "f3.py", 3, "t3", "e3", False, "medium")
    vf3 = VersionFileRow("f3.py", "skill", "s3", "cs3", None, None, "code", "python", 3, 30, "source", [])
    res2 = AnalysisResult("review", None, [f3], [vf3], {"schemaVersion": 1}, "fp2", False)
    save_analysis(db_conn, job, version_id, res2, created_version=False)

    with db_conn.cursor() as cur:
        cur.execute('SELECT COUNT(*) FROM "finding" WHERE "versionId" = %s', (version_id,))
        assert cur.fetchone()[0] == 1
        cur.execute('SELECT COUNT(*) FROM "version_file" WHERE "versionId" = %s', (version_id,))
        assert cur.fetchone()[0] == 1


def test_fingerprint_check_same_returns_credit(db_conn: psycopg.Connection) -> None:
    """When remote scripts are unchanged, fingerprint_check completes pointing to
    existing version with credit returned.
    """
    skill_id = insert_skill(db_conn, slug="fp-check-same-skill")

    remote_url = "https://example.com/install.sh"
    remote_content = b"echo hello\n"
    remote_sha = hashlib.sha256(remote_content).hexdigest()

    skill_md_content = b"# Skill\n"
    skill_md_sha = git_blob_sha(skill_md_content)
    source_files_data = [
        {"path": "SKILL.md", "type": "blob", "sha": skill_md_sha, "size": len(skill_md_content), "mode": "100644"}
    ]
    tree_entries = [TreeEntry("SKILL.md", "blob", skill_md_sha, len(skill_md_content), "100644")]
    remotes = [RemoteScript(remote_url, remote_content, remote_sha, datetime.now(UTC), None)]
    calculated_fp = final_fingerprint(tree_entries, remotes)

    # Version 1 is already analyzed with calculated_fp
    v1_id = insert_version(
        db_conn,
        skill_id=skill_id,
        fingerprint=calculated_fp,
        verdict="no_serious_findings",
        source_files=source_files_data,
        has_remote_scripts=True,
    )

    # Version 2 is the unanalyzed submission being checked
    v2_id = insert_version(
        db_conn,
        skill_id=skill_id,
        source_files=source_files_data,
        has_remote_scripts=True,
    )
    with db_conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "version_file" (
                "id", "versionId", "path", "origin", "contentSha256", "remoteUrl",
                "kind", "lineCount", "byteSize", "review", "flags"
            )
            VALUES (%s, %s, %s, 'remote'::"FileOrigin", %s, %s, 'code', 1, 10, 'source'::"FileReview", '{}')
            """,
            (new_id(), v2_id, remote_url, remote_sha, remote_url),
        )

    job_id = insert_job(db_conn, version_id=v2_id, kind="fingerprint_check", credit_month="2026-10")
    job = claim_job(db_conn)
    assert job is not None

    deps = PipelineDeps(
        download=lambda _j: io.BytesIO(b""),
        fetcher=lambda _u: FetchResult(status="ok", data=remote_content, final_url=remote_url, reason=None),
        osv=lambda _d: OsvResult(advisories={}, available=True),
    )

    pipeline.run_job(db_conn, job, deps)

    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT "status", "versionId", "creditReturnedAt", "step"
            FROM "analysis_job"
            WHERE "id" = %s
            """,
            (job_id,),
        )
        row = cur.fetchone()

    assert row is not None
    assert row[0] == "done"
    assert row[1] == v1_id  # Pointed back to version 1
    assert row[2] is not None  # Credit returned
    assert row[3] is None


def test_fingerprint_check_changed_creates_version(db_conn: psycopg.Connection) -> None:
    """When remote scripts change, fingerprint_check clones version and runs full analysis."""
    skill_id = insert_skill(db_conn, slug="fp-check-changed-skill")

    remote_url = "https://example.com/install.sh"
    new_remote_content = b"echo new-content\n"
    new_remote_sha = hashlib.sha256(new_remote_content).hexdigest()

    skill_md_content = b"# Skill\n\n```bash\ncurl -fsSL https://example.com/install.sh | sh\n```\n"
    skill_md_sha = git_blob_sha(skill_md_content)
    source_files_data = [
        {"path": "SKILL.md", "type": "blob", "sha": skill_md_sha, "size": len(skill_md_content), "mode": "100644"}
    ]

    v1_id = insert_version(
        db_conn,
        skill_id=skill_id,
        fingerprint="old_fp",
        verdict="no_serious_findings",
        source_files=source_files_data,
        has_remote_scripts=True,
    )
    v2_id = insert_version(
        db_conn,
        skill_id=skill_id,
        source_files=source_files_data,
        has_remote_scripts=True,
    )
    with db_conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "version_file" (
                "id", "versionId", "path", "origin", "contentSha256", "remoteUrl",
                "kind", "lineCount", "byteSize", "review", "flags"
            )
            VALUES (%s, %s, %s, 'remote'::"FileOrigin", %s, %s, 'code', 1, 10, 'source'::"FileReview", '{}')
            """,
            (new_id(), v2_id, remote_url, "old_sha", remote_url),
        )

    job_id = insert_job(db_conn, version_id=v2_id, kind="fingerprint_check")
    job = claim_job(db_conn)
    assert job is not None

    def mock_download(_j: pipeline.ClaimedJob) -> io.BytesIO:
        return _make_tarball({"SKILL.md": skill_md_content})

    deps = PipelineDeps(
        download=mock_download,
        fetcher=lambda _u: FetchResult(status="ok", data=new_remote_content, final_url=remote_url, reason=None),
        osv=lambda _d: OsvResult(advisories={}, available=True),
    )

    pipeline.run_job(db_conn, job, deps)

    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT "status", "versionId", "kind"
            FROM "analysis_job"
            WHERE "id" = %s
            """,
            (job_id,),
        )
        job_row = cur.fetchone()

    assert job_row is not None
    assert job_row[0] == "done"
    new_version_id = job_row[1]
    assert new_version_id not in (v1_id, v2_id)
    assert job_row[2] == "analysis"

    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT "verdict", "hasRemoteScripts", "fingerprint"
            FROM "skill_version"
            WHERE "id" = %s
            """,
            (new_version_id,),
        )
        ver_row = cur.fetchone()

    assert ver_row is not None
    assert ver_row[0] is not None
    assert ver_row[1] is True

    source_files = [
        TreeEntry(
            path=f["path"],
            type=f["type"],
            sha=f["sha"],
            size=f["size"],
            mode=f["mode"],
        )
        for f in source_files_data
    ]
    expected_fp = final_fingerprint(
        source_files,
        [
            RemoteScript(
                url=remote_url,
                content=None,
                sha256=new_remote_sha,
                downloaded_at=None,
                failure=None,
            ),
        ],
    )
    assert ver_row[2] == expected_fp


def test_concurrent_fingerprint_conflict(db_conn: psycopg.Connection) -> None:
    """When fingerprint uniqueness conflicts concurrently, job adopts winner and deletes duplicate version."""
    skill_id = insert_skill(db_conn, slug="concurrent-conflict-skill")
    conflicting_fp = "fp_conflict_winner_hash"

    # Pre-insert existing analyzed version with the conflicting fingerprint
    v_winner_id = insert_version(
        db_conn,
        skill_id=skill_id,
        fingerprint=conflicting_fp,
        verdict="no_serious_findings",
    )

    # Job's version that will fail to acquire the same fingerprint
    v_loser_id = insert_version(db_conn, skill_id=skill_id)
    job_id = insert_job(db_conn, version_id=v_loser_id, credit_month="2026-10")
    job = claim_job(db_conn)
    assert job is not None

    res = AnalysisResult(
        verdict="no_serious_findings",
        top_finding=None,
        findings=[],
        files=[],
        report={"schemaVersion": 1},
        fingerprint=conflicting_fp,
        has_remote_scripts=False,
    )

    # Save with created_version=True: should catch UniqueViolation, point job to v_winner_id,
    # return credit, and delete v_loser_id
    save_analysis(
        db_conn,
        job,
        v_loser_id,
        res,
        created_version=True,
    )

    with db_conn.cursor() as cur:
        # Job must be done and point to winner
        cur.execute(
            """
            SELECT "status", "versionId", "creditReturnedAt"
            FROM "analysis_job"
            WHERE "id" = %s
            """,
            (job_id,),
        )
        job_row = cur.fetchone()
        assert job_row is not None
        assert job_row[0] == "done"
        assert job_row[1] == v_winner_id
        assert job_row[2] is not None  # Credit was returned

        # Loser version was deleted
        cur.execute('SELECT COUNT(*) FROM "skill_version" WHERE "id" = %s', (v_loser_id,))
        assert cur.fetchone()[0] == 0
