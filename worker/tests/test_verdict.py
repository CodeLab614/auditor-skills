"""Tests for verdict calculation, top finding selection, and byte coverage."""

from datetime import UTC, datetime

from auditor_worker.findings import Finding
from auditor_worker.inventory import InventoryItem
from auditor_worker.remote import RemoteScript
from auditor_worker.verdict import compute_verdict, coverage


def _make_finding(
    rule_id: str = "test.rule",
    severity: str = "low",
    declared: bool = False,
    file_path: str = "test.py",
    line: int = 1,
) -> Finding:
    return Finding(
        rule_id=rule_id,
        category="test",
        severity_undeclared=severity,  # type: ignore[arg-type]
        severity_declared=severity,  # type: ignore[arg-type]
        file_path=file_path,
        line=line,
        title="Test finding",
        evidence="test evidence",
        declared=declared,
        severity=severity,  # type: ignore[arg-type]
    )


def _make_item(
    path: str = "main.py",
    kind: str = "code",
    byte_size: int = 100,
) -> InventoryItem:
    return InventoryItem(
        path=path,
        blob_sha="abc1234",
        byte_size=byte_size,
        kind=kind,
        language="python" if kind == "code" else None,
        line_count=10,
        flags=["binary"] if kind == "binary" else [],
    )


def _make_remote(
    url: str = "https://example.com/script.sh",
    content: bytes | None = b"echo hi\n",
) -> RemoteScript:
    return RemoteScript(
        url=url,
        content=content,
        sha256="hash123" if content is not None else None,
        downloaded_at=datetime.now(UTC) if content is not None else None,
        failure=None if content is not None else "Connection refused",
    )


def test_verdict_rules() -> None:
    """Validate verdict rules for critical, high, undeclared medium, binary, failed remote, and clean."""
    # 1. Critical finding -> dangerous
    v_crit, _ = compute_verdict([_make_finding(severity="critical")], [], [])
    assert v_crit == "dangerous"

    # 2. Medium declared -> no_serious_findings
    v_med_decl, _ = compute_verdict([_make_finding(severity="medium", declared=True)], [], [])
    assert v_med_decl == "no_serious_findings"

    # 3. Medium undeclared -> review
    v_med_undecl, _ = compute_verdict([_make_finding(severity="medium", declared=False)], [], [])
    assert v_med_undecl == "review"

    # 4. Binary item present -> review
    v_bin, _ = compute_verdict([], [_make_item(kind="binary", byte_size=500)], [])
    assert v_bin == "review"

    # 5. Failed remote script -> review
    v_rem_fail, _ = compute_verdict([], [], [_make_remote(content=None)])
    assert v_rem_fail == "review"

    # 6. Nothing or only low findings -> no_serious_findings
    v_clean, top_clean = compute_verdict([], [], [])
    assert v_clean == "no_serious_findings"
    assert top_clean is None


def test_top_finding_order() -> None:
    """Top finding selects the most severe, preferring undeclared over declared, then path/line/rule."""
    f_crit = _make_finding(rule_id="b.crit", severity="critical", declared=False, file_path="z.py", line=10)
    f_high_decl = _make_finding(rule_id="a.high", severity="high", declared=True, file_path="a.py", line=1)
    f_high_undecl = _make_finding(rule_id="a.high", severity="high", declared=False, file_path="a.py", line=1)
    f_low = _make_finding(rule_id="a.low", severity="low", declared=False, file_path="a.py", line=1)

    # Critical wins over high
    _, top = compute_verdict([f_high_undecl, f_crit, f_low], [], [])
    assert top == f_crit

    # Undeclared high wins over declared high
    _, top_high = compute_verdict([f_high_decl, f_high_undecl], [], [])
    assert top_high == f_high_undecl

    # File path tie-breaking
    f_high_a = _make_finding(rule_id="z.high", severity="high", declared=False, file_path="a.py", line=5)
    f_high_b = _make_finding(rule_id="z.high", severity="high", declared=False, file_path="b.py", line=5)
    _, top_path = compute_verdict([f_high_b, f_high_a], [], [])
    assert top_path == f_high_a


def test_coverage_bytes() -> None:
    """Byte coverage categorizes source, decompiled (0 in phase 4), and unreviewable."""
    items = [
        _make_item(path="app.py", kind="code", byte_size=100),
        _make_item(path="README.md", kind="markdown", byte_size=50),
        _make_item(path="tool.exe", kind="binary", byte_size=500),
    ]
    remotes = [
        _make_remote(url="https://example.com/ok.sh", content=b"1234567890"),  # 10 bytes
        _make_remote(url="https://example.com/fail.sh", content=None),  # 0 bytes
    ]

    cov = coverage(items, remotes)

    assert cov == {
        "sourceBytes": 160,  # 100 + 50 + 10
        "decompiledBytes": 0,
        "unreviewableBytes": 500,
    }
