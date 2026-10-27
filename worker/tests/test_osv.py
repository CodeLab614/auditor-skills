"""Tests for OSV API querying and dependency findings generation."""

import json

from auditor_worker.dependencies import Dependency
from auditor_worker.osv import OsvResult, dependency_findings, query_osv


def test_query_builds_batch_body() -> None:
    """query_osv builds correct JSON batch body sent to transport."""
    dep = Dependency(
        ecosystem="PyPI",
        name="requests",
        version="2.31.0",
        pinned=True,
        file_path="requirements.txt",
        line=1,
        source="manifest",
    )
    sent_bodies: list[bytes] = []

    def fake_transport(body: bytes) -> bytes:
        sent_bodies.append(body)
        return json.dumps({"results": [{"vulns": []}]}).encode("utf-8")

    res = query_osv([dep], transport=fake_transport)
    assert res.available is True
    assert len(sent_bodies) == 1

    payload = json.loads(sent_bodies[0].decode("utf-8"))
    expected = {"queries": [{"package": {"name": "requests", "ecosystem": "PyPI"}, "version": "2.31.0"}]}
    assert payload == expected


def test_only_pinned_supported_queried() -> None:
    """Only pinned dependencies in supported ecosystems are queried."""
    deps = [
        Dependency(
            ecosystem="PyPI",
            name="pinned-pypi",
            version="1.0.0",
            pinned=True,
            file_path="requirements.txt",
            line=1,
            source="manifest",
        ),
        Dependency(
            ecosystem="PyPI",
            name="unpinned-pypi",
            version=None,
            pinned=False,
            file_path="requirements.txt",
            line=2,
            source="manifest",
        ),
        Dependency(
            ecosystem="brew",
            name="pinned-brew",
            version="1.0.0",
            pinned=True,
            file_path="setup.sh",
            line=3,
            source="install",
        ),
    ]
    sent_bodies: list[bytes] = []

    def fake_transport(body: bytes) -> bytes:
        sent_bodies.append(body)
        return json.dumps({"results": [{"vulns": []}]}).encode("utf-8")

    res = query_osv(deps, transport=fake_transport)
    assert res.available is True
    assert len(sent_bodies) == 1

    payload = json.loads(sent_bodies[0].decode("utf-8"))
    assert len(payload["queries"]) == 1
    assert payload["queries"][0]["package"]["name"] == "pinned-pypi"


def test_no_queries_no_network() -> None:
    """query_osv with no queryable dependencies returns available=True without invoking transport."""

    def fail_transport(body: bytes) -> bytes:
        raise AssertionError("Network transport should not be invoked")

    res_empty = query_osv([], transport=fail_transport)
    assert res_empty == OsvResult(advisories={}, available=True)

    unpinned_dep = Dependency(
        ecosystem="npm",
        name="lodash",
        version=None,
        pinned=False,
        file_path="package.json",
        line=1,
        source="manifest",
    )
    res_unpinned = query_osv([unpinned_dep], transport=fail_transport)
    assert res_unpinned == OsvResult(advisories={}, available=True)


def test_osv_malicious_is_critical() -> None:
    """Dependency with advisory starting with MAL- produces critical severity finding."""
    dep = Dependency(
        ecosystem="PyPI",
        name="evil-pkg",
        version="0.1.0",
        pinned=True,
        file_path="requirements.txt",
        line=5,
        source="manifest",
    )
    osv_res = OsvResult(
        advisories={("PyPI", "evil-pkg", "0.1.0"): ["MAL-2024-0012", "GHSA-xxxx-yyyy"]},
        available=True,
    )
    findings = dependency_findings([dep], osv_res)

    assert len(findings) == 1
    f = findings[0]
    assert f.rule_id == "deps.malicious"
    assert f.category == "dependencies"
    assert f.severity_undeclared == "critical"
    assert f.severity_declared == "critical"
    assert f.title == "Paquete malicioso conocido: evil-pkg"
    assert f.evidence == "MAL-2024-0012, GHSA-xxxx-yyyy"
    assert f.token == "evil-pkg"
    assert f.version == "0.1.0"
    assert f.ecosystem == "PyPI"
    assert f.file_path == "requirements.txt"
    assert f.line == 5


def test_known_vuln_medium_with_ids() -> None:
    """Dependency with known non-malicious advisories produces medium severity finding."""
    dep = Dependency(
        ecosystem="npm",
        name="express",
        version="4.17.1",
        pinned=True,
        file_path="package.json",
        line=12,
        source="manifest",
    )
    osv_res = OsvResult(
        advisories={("npm", "express", "4.17.1"): ["GHSA-1111", "CVE-2022-2222"]},
        available=True,
    )
    findings = dependency_findings([dep], osv_res)

    assert len(findings) == 1
    f = findings[0]
    assert f.rule_id == "deps.known-vuln"
    assert f.category == "dependencies"
    assert f.severity_undeclared == "medium"
    assert f.severity_declared == "medium"
    assert f.title == "Vulnerabilidad conocida en express 4.17.1"
    assert f.evidence == "GHSA-1111, CVE-2022-2222"
    assert f.token == "express"
    assert f.version == "4.17.1"
    assert f.ecosystem == "npm"
    assert f.file_path == "package.json"
    assert f.line == 12


def test_osv_down_marks_unavailable() -> None:
    """Transport raising TimeoutError marks OSV as unavailable and returns empty advisories."""
    dep = Dependency(
        ecosystem="PyPI",
        name="requests",
        version="2.31.0",
        pinned=True,
        file_path="requirements.txt",
        line=1,
        source="manifest",
    )

    def timeout_transport(body: bytes) -> bytes:
        raise TimeoutError("Connection timed out")

    res = query_osv([dep], transport=timeout_transport)
    assert res.available is False
    assert res.advisories == {}


def test_mismatched_results_marks_unavailable() -> None:
    """Response containing fewer results than queries marks OSV as unavailable."""
    deps = [
        Dependency(
            ecosystem="PyPI",
            name="pkg-a",
            version="1.0.0",
            pinned=True,
            file_path="requirements.txt",
            line=1,
            source="manifest",
        ),
        Dependency(
            ecosystem="PyPI",
            name="pkg-b",
            version="1.0.0",
            pinned=True,
            file_path="requirements.txt",
            line=2,
            source="manifest",
        ),
    ]

    def mismatch_transport(body: bytes) -> bytes:
        # Return only 1 result for 2 queries
        return json.dumps({"results": [{"vulns": []}]}).encode("utf-8")

    res = query_osv(deps, transport=mismatch_transport)
    assert res.available is False
    assert res.advisories == {}


def test_unpinned_only_for_manifest() -> None:
    """Unpinned findings are emitted only for manifest dependencies, not for install findings."""
    dep_manifest = Dependency(
        ecosystem="PyPI",
        name="flask",
        version=None,
        pinned=False,
        file_path="requirements.txt",
        line=4,
        source="manifest",
    )
    dep_install = Dependency(
        ecosystem="PyPI",
        name="django",
        version=None,
        pinned=False,
        file_path="setup.sh",
        line=8,
        source="install",
    )
    osv_res = OsvResult(advisories={}, available=True)
    findings = dependency_findings([dep_manifest, dep_install], osv_res)

    assert len(findings) == 1
    f = findings[0]
    assert f.rule_id == "deps.unpinned"
    assert f.category == "dependencies"
    assert f.token == "flask"
    assert f.title == "Dependencia sin versión fija: flask"
    assert f.severity_undeclared == "medium"
    assert f.severity_declared == "medium"
    assert f.file_path == "requirements.txt"
    assert f.line == 4


def test_batches_of_1000() -> None:
    """1500 dependencies are queried in 2 batches of maximum 1000 items."""
    deps = [
        Dependency(
            ecosystem="PyPI",
            name=f"pkg-{i}",
            version="1.0.0",
            pinned=True,
            file_path="requirements.txt",
            line=i + 1,
            source="manifest",
        )
        for i in range(1500)
    ]
    batch_sizes: list[int] = []

    def batch_transport(body: bytes) -> bytes:
        data = json.loads(body.decode("utf-8"))
        queries = data["queries"]
        batch_sizes.append(len(queries))
        return json.dumps({"results": [{}] * len(queries)}).encode("utf-8")

    res = query_osv(deps, transport=batch_transport)
    assert res.available is True
    assert len(batch_sizes) == 2
    assert batch_sizes[0] == 1000
    assert batch_sizes[1] == 500
