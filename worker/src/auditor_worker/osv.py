"""OSV (Open Source Vulnerabilities) API integration and findings generation."""

import json
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass

from auditor_worker.dependencies import Dependency
from auditor_worker.findings import Finding, make_evidence

OSV_URL = "https://api.osv.dev/v1/querybatch"
MAX_OSV_RESPONSE_BYTES = 5 * 1024 * 1024  # 5 MB
BATCH_SIZE = 1000
SUPPORTED_ECOSYSTEMS = {"PyPI", "npm", "RubyGems", "crates.io", "Go"}


@dataclass
class OsvResult:
    """Result of querying the OSV API for vulnerability advisories."""

    advisories: dict[tuple[str, str, str], list[str]]
    available: bool


def _default_transport(body: bytes, timeout: float) -> bytes:
    req = urllib.request.Request(
        OSV_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "auditor-skills-worker",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 - fixed https URL (OSV_URL)
        if resp.status != 200:
            raise ValueError(f"Unexpected HTTP status {resp.status}")
        data = resp.read(MAX_OSV_RESPONSE_BYTES + 1)
        if len(data) > MAX_OSV_RESPONSE_BYTES:
            raise ValueError("OSV response exceeded 5 MB")
        return data


def query_osv(
    deps: list[Dependency],
    *,
    transport: Callable[[bytes], bytes] | None = None,
    timeout: float = 15.0,
) -> OsvResult:
    """Query OSV API for pinned dependencies in supported ecosystems."""
    unique_keys: list[tuple[str, str, str]] = []
    seen: set[tuple[str, str, str]] = set()

    for dep in deps:
        if dep.pinned and dep.version is not None and dep.ecosystem in SUPPORTED_ECOSYSTEMS:
            key = (dep.ecosystem, dep.name, dep.version)
            if key not in seen:
                seen.add(key)
                unique_keys.append(key)

    if not unique_keys:
        return OsvResult(advisories={}, available=True)

    advisories: dict[tuple[str, str, str], list[str]] = {}

    for i in range(0, len(unique_keys), BATCH_SIZE):
        batch = unique_keys[i : i + BATCH_SIZE]
        payload = {
            "queries": [{"package": {"name": name, "ecosystem": eco}, "version": ver} for eco, name, ver in batch]
        }
        body = json.dumps(payload).encode("utf-8")

        try:
            if transport is not None:
                resp_bytes = transport(body)
            else:
                resp_bytes = _default_transport(body, timeout)

            if not isinstance(resp_bytes, bytes | bytearray) or len(resp_bytes) > MAX_OSV_RESPONSE_BYTES:
                return OsvResult(advisories={}, available=False)

            data = json.loads(resp_bytes.decode("utf-8"))
            if not isinstance(data, dict):
                return OsvResult(advisories={}, available=False)

            results = data.get("results")
            if not isinstance(results, list) or len(results) != len(batch):
                return OsvResult(advisories={}, available=False)

            # Pagination (next_page_token) is intentionally not followed.
            for key, res in zip(batch, results, strict=True):
                if not isinstance(res, dict):
                    return OsvResult(advisories={}, available=False)
                vulns = res.get("vulns")
                if vulns and isinstance(vulns, list):
                    ids = [v["id"] for v in vulns if isinstance(v, dict) and "id" in v]
                    if ids:
                        advisories[key] = ids
        except Exception:
            return OsvResult(advisories={}, available=False)

    return OsvResult(advisories=advisories, available=True)


def dependency_findings(deps: list[Dependency], osv: OsvResult) -> list[Finding]:
    """Convert dependencies and OSV advisory results into security findings."""
    findings: list[Finding] = []

    for dep in deps:
        key = (dep.ecosystem, dep.name, dep.version) if dep.version is not None else None
        ids = osv.advisories.get(key, []) if key is not None else []

        if any(advisory_id.startswith("MAL-") for advisory_id in ids):
            evidence = make_evidence(", ".join(ids))
            findings.append(
                Finding(
                    rule_id="deps.malicious",
                    category="dependencies",
                    severity_undeclared="critical",
                    severity_declared="critical",
                    file_path=dep.file_path,
                    line=dep.line,
                    title=f"Paquete malicioso conocido: {dep.name}",
                    evidence=evidence,
                    token=dep.name,
                    version=dep.version,
                    ecosystem=dep.ecosystem,
                )
            )
        elif ids:
            evidence = make_evidence(", ".join(ids))
            findings.append(
                Finding(
                    rule_id="deps.known-vuln",
                    category="dependencies",
                    severity_undeclared="medium",
                    severity_declared="medium",
                    file_path=dep.file_path,
                    line=dep.line,
                    title=f"Vulnerabilidad conocida en {dep.name} {dep.version}",
                    evidence=evidence,
                    token=dep.name,
                    version=dep.version,
                    ecosystem=dep.ecosystem,
                )
            )
        elif not dep.pinned and dep.source == "manifest":
            evidence = make_evidence(dep.name)
            findings.append(
                Finding(
                    rule_id="deps.unpinned",
                    category="dependencies",
                    severity_undeclared="medium",
                    severity_declared="medium",
                    file_path=dep.file_path,
                    line=dep.line,
                    title=f"Dependencia sin versión fija: {dep.name}",
                    evidence=evidence,
                    token=dep.name,
                    version=None,
                    ecosystem=dep.ecosystem,
                )
            )

    return findings


__all__ = ["OsvResult", "dependency_findings", "query_osv"]
