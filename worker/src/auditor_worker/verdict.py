"""Verdict and coverage computation for skill auditor."""

from auditor_worker.findings import Finding
from auditor_worker.inventory import InventoryItem
from auditor_worker.remote import RemoteScript

SEVERITY_RANK: dict[str, int] = {
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 3,
}


def compute_verdict(
    findings: list[Finding],
    items: list[InventoryItem],
    remotes: list[RemoteScript],
) -> tuple[str, Finding | None]:
    """Compute the overall analysis verdict and identify the primary finding."""
    if any(f.severity == "critical" for f in findings):
        verdict = "dangerous"
    elif (
        any(f.severity == "high" for f in findings)
        or any(f.severity == "medium" and not f.declared for f in findings)
        or any(item.kind == "binary" for item in items)
        or any(r.content is None for r in remotes)
    ):
        verdict = "review"
    else:
        verdict = "no_serious_findings"

    if not findings:
        top_finding = None
    else:
        sorted_findings = sorted(
            findings,
            key=lambda f: (
                SEVERITY_RANK.get(f.severity or "low", 3),
                f.declared,
                f.file_path,
                f.line,
                f.rule_id,
            ),
        )
        top_finding = sorted_findings[0]

    return verdict, top_finding


def coverage(
    items: list[InventoryItem],
    remotes: list[RemoteScript],
) -> dict[str, int]:
    """Compute byte coverage categorized into source, decompiled, and unreviewable."""
    source_bytes = sum(item.byte_size for item in items if item.kind != "binary")
    source_bytes += sum(len(r.content) for r in remotes if r.content is not None)
    unreviewable_bytes = sum(item.byte_size for item in items if item.kind == "binary")

    return {
        "sourceBytes": source_bytes,
        "decompiledBytes": 0,
        "unreviewableBytes": unreviewable_bytes,
    }


__all__ = ["SEVERITY_RANK", "compute_verdict", "coverage"]
