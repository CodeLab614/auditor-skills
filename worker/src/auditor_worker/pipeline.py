"""Analysis pipeline execution and orchestration."""

import dataclasses
import hashlib
import posixpath
import urllib.parse
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import BinaryIO, Literal

import psycopg

from auditor_worker import fetch, github, osv, rules, store
from auditor_worker.archive import read_snapshot
from auditor_worker.config import Config
from auditor_worker.db import (
    ClaimedJob,
    complete_with_existing,
    convert_to_analysis,
    create_version_from,
    find_analyzed_version,
    remote_urls,
    report_progress,
)
from auditor_worker.declared import apply_declared
from auditor_worker.dependencies import Dependency, parse_dependencies
from auditor_worker.errors import AnalysisFailure
from auditor_worker.fetch import FetchResult
from auditor_worker.findings import Finding
from auditor_worker.fingerprint import final_fingerprint
from auditor_worker.installation import (
    InstallContext,
    apply_remote_severity,
    install_steps,
    plugin_name_for,
    readme_findings,
)
from auditor_worker.inventory import InventoryItem, inventory
from auditor_worker.osv import OsvResult, dependency_findings
from auditor_worker.remote import collect_remote_scripts, download_urls
from auditor_worker.report import build_report
from auditor_worker.verdict import compute_verdict, coverage


@dataclass
class PipelineDeps:
    """External I/O dependencies for the analysis pipeline."""

    download: Callable[[ClaimedJob], BinaryIO]
    fetcher: Callable[[str], FetchResult]
    osv: Callable[[list[Dependency]], OsvResult]


def default_deps(config: Config) -> PipelineDeps:
    """Construct production I/O dependencies from worker configuration."""
    return PipelineDeps(
        download=lambda job: github.download_tarball(
            owner=job.owner,
            repo=job.repo,
            commit_sha=job.commit_sha,
            token=config.github_token,
        ),
        fetcher=fetch.fetch_public,
        osv=osv.query_osv,
    )


@dataclass
class VersionFileRow:
    """File record to be persisted in version_file."""

    path: str
    origin: Literal["skill", "plugin", "readme", "remote"]
    blob_sha: str | None
    content_sha256: str
    remote_url: str | None
    downloaded_at: datetime | None
    kind: str
    language: str | None
    line_count: int
    byte_size: int
    review: Literal["source", "decompiled", "unreviewable"]
    flags: list[str]


@dataclass
class AnalysisResult:
    """Result of pure in-memory skill analysis."""

    verdict: str
    top_finding: Finding | None
    findings: list[Finding]
    files: list[VersionFileRow]
    report: dict
    fingerprint: str
    has_remote_scripts: bool


def analyze(
    job: ClaimedJob,
    deps: PipelineDeps,
    progress: Callable[[str, int | None, int | None], None],
) -> AnalysisResult:
    """Execute pure in-memory analysis pipeline for a claimed job."""
    if not job.source_files:
        raise AnalysisFailure("Esta versión no tiene la lista de archivos: vuelve a enviarla")

    progress("download", None, None)
    stream = deps.download(job)
    try:
        snapshot = read_snapshot(stream, job.source_files, job.skill_path)
    finally:
        stream.close()

    clean_path = job.skill_path.strip("/")
    skill_md_path = f"{clean_path}/SKILL.md" if clean_path and clean_path != "." else "SKILL.md"
    if skill_md_path not in snapshot.files:
        raise AnalysisFailure("No es una skill: falta SKILL.md")

    skill_md = snapshot.files[skill_md_path].decode("utf-8", errors="replace")

    progress("inventory", None, None)
    items = inventory(snapshot)

    text_items = [it for it in items if it.kind not in {"binary", "image"}]
    total_text = len(text_items)
    file_findings: list[Finding] = []
    total_suppressed = 0

    for i, item in enumerate(text_items, start=1):
        progress("rules", i, total_text)
        text = snapshot.files[item.path].decode("utf-8", errors="replace")
        kept, supp = rules.scan(item, text)
        file_findings.extend(kept)
        total_suppressed += supp

    struct_findings = rules.scan_structure(snapshot, items, job.skill_path)
    all_rules_findings = file_findings + struct_findings

    progress("install", None, None)
    readme_finds = readme_findings(snapshot)
    findings_so_far = all_rules_findings + readme_finds
    apply_remote_severity(findings_so_far, job.owner, job.repo)

    progress("remote", None, None)
    remotes = collect_remote_scripts(findings_so_far, deps.fetcher)
    remote_findings: list[Finding] = []

    for r in remotes:
        if r.content is not None:
            parsed = urllib.parse.urlsplit(r.url)
            ext = posixpath.splitext(parsed.path)[1].lower()
            if ext == ".py":
                lang = "python"
            elif ext == ".ps1":
                lang = "powershell"
            elif ext in {".js", ".mjs"}:
                lang = "js"
            else:
                lang = "shell"

            r_text = r.content.decode("utf-8", errors="replace")
            r_item = InventoryItem(
                path=r.url,
                blob_sha="",
                byte_size=len(r.content),
                kind="code",
                language=lang,
                line_count=len(r_text.splitlines()),
                flags=[],
            )
            kept, supp = rules.scan(r_item, r_text)
            total_suppressed += supp
            remote_findings.extend(kept)

    apply_remote_severity(remote_findings, job.owner, job.repo)

    progress("dependencies", None, None)
    install_pkg_findings = [f for f in findings_so_far if f.rule_id == "install.package"]
    deps_list, invalid_manifests = parse_dependencies(snapshot, install_pkg_findings)
    osv_res = deps.osv(deps_list)
    dep_findings = dependency_findings(deps_list, osv_res)

    progress("verdict", None, None)
    all_findings = findings_so_far + remote_findings + dep_findings
    apply_declared(all_findings, skill_md)

    ctx = InstallContext(
        display_owner=job.display_owner,
        display_repo=job.display_repo,
        skill_name=job.skill_name,
        skill_path=job.skill_path,
        plugin_name=plugin_name_for(snapshot, job.skill_path),
    )
    inst_steps = install_steps(ctx, snapshot, readme_finds)
    verdict, top_finding = compute_verdict(all_findings, items, remotes)
    cov = coverage(items, remotes)
    rep = build_report(
        install_steps_list=inst_steps,
        dependencies_list=deps_list,
        items=items,
        remotes=remotes,
        top_finding=top_finding,
        osv_result=osv_res,
        invalid_manifests=invalid_manifests,
        submodules=snapshot.submodules,
        coverage_dict=cov,
        suppressed=total_suppressed,
    )
    fp = final_fingerprint(job.source_files, remotes)
    has_remotes = len(remotes) > 0

    file_rows: list[VersionFileRow] = []
    clean_skill = job.skill_path.strip("/")
    is_root = not clean_skill or clean_skill == "."

    for item in items:
        raw_bytes = snapshot.files[item.path]
        content_sha = hashlib.sha256(raw_bytes).hexdigest()
        if is_root or item.path == clean_skill or item.path.startswith(f"{clean_skill}/"):
            origin = "skill"
        else:
            origin = "plugin"
        review = "unreviewable" if item.kind == "binary" else "source"
        file_rows.append(
            VersionFileRow(
                path=item.path,
                origin=origin,
                blob_sha=item.blob_sha,
                content_sha256=content_sha,
                remote_url=None,
                downloaded_at=None,
                kind=item.kind,
                language=item.language,
                line_count=item.line_count,
                byte_size=item.byte_size,
                review=review,
                flags=item.flags,
            )
        )

    for readme_path, data in snapshot.readmes.items():
        if readme_path not in snapshot.files:
            content_sha = hashlib.sha256(data).hexdigest()
            text = data.decode("utf-8", errors="replace")
            file_rows.append(
                VersionFileRow(
                    path=readme_path,
                    origin="readme",
                    blob_sha=None,
                    content_sha256=content_sha,
                    remote_url=None,
                    downloaded_at=None,
                    kind="markdown",
                    language="markdown",
                    line_count=len(text.splitlines()),
                    byte_size=len(data),
                    review="source",
                    flags=[],
                )
            )

    for r in remotes:
        if r.content is not None:
            parsed = urllib.parse.urlsplit(r.url)
            ext = posixpath.splitext(parsed.path)[1].lower()
            if ext == ".py":
                lang = "python"
            elif ext == ".ps1":
                lang = "powershell"
            elif ext in {".js", ".mjs"}:
                lang = "js"
            else:
                lang = "shell"
            content_sha = r.sha256 or hashlib.sha256(r.content).hexdigest()
            text = r.content.decode("utf-8", errors="replace")
            file_rows.append(
                VersionFileRow(
                    path=r.url,
                    origin="remote",
                    blob_sha=None,
                    content_sha256=content_sha,
                    remote_url=r.url,
                    downloaded_at=r.downloaded_at,
                    kind="code",
                    language=lang,
                    line_count=len(text.splitlines()),
                    byte_size=len(r.content),
                    review="source",
                    flags=[],
                )
            )
        else:
            file_rows.append(
                VersionFileRow(
                    path=r.url,
                    origin="remote",
                    blob_sha=None,
                    content_sha256="",
                    remote_url=r.url,
                    downloaded_at=None,
                    kind="code",
                    language=None,
                    line_count=0,
                    byte_size=0,
                    review="unreviewable",
                    flags=[],
                )
            )

    return AnalysisResult(
        verdict=verdict,
        top_finding=top_finding,
        findings=all_findings,
        files=file_rows,
        report=rep,
        fingerprint=fp,
        has_remote_scripts=has_remotes,
    )


def run_job(conn: psycopg.Connection, job: ClaimedJob, deps: PipelineDeps) -> None:
    """Run analysis pipeline for a claimed job according to its kind."""

    def progress(step: str, current: int | None = None, total: int | None = None) -> None:
        report_progress(conn, job.id, step, current, total)

    if job.kind == "analysis":
        result = analyze(job, deps, progress)
        progress("save", None, None)
        store.save_analysis(conn, job, job.version_id, result, created_version=False)
    elif job.kind == "fingerprint_check":
        progress("remote", None, None)
        urls = remote_urls(conn, job.version_id)
        remotes = download_urls(urls, deps.fetcher)
        fp = final_fingerprint(job.source_files, remotes)

        existing_id = find_analyzed_version(conn, job.skill_id, fp)
        if existing_id is not None:
            complete_with_existing(conn, job.id, existing_id)
            return

        new_id_val = create_version_from(conn, job.version_id, job.user_id)
        convert_to_analysis(conn, job.id, new_id_val)
        updated_job = dataclasses.replace(job, version_id=new_id_val, kind="analysis")
        result = analyze(updated_job, deps, progress)
        progress("save", None, None)
        store.save_analysis(conn, updated_job, new_id_val, result, created_version=True)
    else:
        raise AnalysisFailure(f"Tipo de trabajo no reconocido: {job.kind}")


__all__ = [
    "AnalysisResult",
    "PipelineDeps",
    "VersionFileRow",
    "analyze",
    "default_deps",
    "run_job",
]
