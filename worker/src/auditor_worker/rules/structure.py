"""Structure rules: struct.symlink-outside, struct.submodule, and struct.binary."""

import posixpath

from auditor_worker.findings import Finding
from auditor_worker.inventory import InventoryItem
from auditor_worker.snapshot import Snapshot


def scan_structure(snapshot: Snapshot, items: list[InventoryItem], skill_path: str) -> list[Finding]:
    """Scan snapshot structure for symlinks outside skill folder, submodules, and binaries."""
    findings: list[Finding] = []
    norm_skill = posixpath.normpath(skill_path.strip("/"))
    is_root_skill = norm_skill in {".", ""}

    # 1. struct.symlink-outside
    for link, target in sorted(snapshot.symlinks.items(), key=lambda x: x[0]):
        norm_link = posixpath.normpath(link.strip("/"))
        link_dir = posixpath.dirname(norm_link)
        is_outside = False

        if posixpath.isabs(target) or target.startswith("/"):
            is_outside = True
        else:
            resolved = posixpath.normpath(posixpath.join(link_dir, target))
            if is_root_skill:
                if resolved == ".." or resolved.startswith("../"):
                    is_outside = True
            else:
                link_inside_skill = norm_link == norm_skill or norm_link.startswith(norm_skill + "/")
                if link_inside_skill:
                    dest_inside_skill = resolved == norm_skill or resolved.startswith(norm_skill + "/")
                    if not dest_inside_skill:
                        is_outside = True
                else:
                    if resolved == ".." or resolved.startswith("../"):
                        is_outside = True

        if is_outside:
            findings.append(
                Finding(
                    rule_id="struct.symlink-outside",
                    category="structure",
                    severity_undeclared="high",
                    severity_declared="high",
                    file_path=link,
                    line=1,
                    title="Enlace simbólico que apunta fuera de la carpeta",
                    evidence=f"{link} → {target}",
                    token=None,
                    url=None,
                )
            )

    # 2. struct.submodule
    for submodule in sorted(snapshot.submodules):
        findings.append(
            Finding(
                rule_id="struct.submodule",
                category="structure",
                severity_undeclared="medium",
                severity_declared="medium",
                file_path=submodule,
                line=1,
                title=f"Submódulo git {submodule}",
                evidence=f"Submódulo git: {submodule}",
                token=None,
                url=None,
            )
        )

    # 3. struct.binary
    for item in sorted(items, key=lambda x: x.path):
        if item.kind == "binary":
            base_name = posixpath.basename(item.path)
            findings.append(
                Finding(
                    rule_id="struct.binary",
                    category="structure",
                    severity_undeclared="high",
                    severity_declared="medium",
                    file_path=item.path,
                    line=1,
                    title=f"Archivo binario no revisable {base_name}",
                    evidence=f"Archivo binario: {base_name}",
                    token=base_name,
                    url=None,
                )
            )

    return findings


__all__ = ["scan_structure"]
