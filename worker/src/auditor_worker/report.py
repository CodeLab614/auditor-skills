"""JSON report generator for skill analysis results."""

from auditor_worker.dependencies import Dependency
from auditor_worker.findings import Finding
from auditor_worker.installation import InstallStep
from auditor_worker.inventory import InventoryItem
from auditor_worker.osv import OsvResult
from auditor_worker.remote import RemoteScript


def build_report(
    install_steps_list: list[InstallStep],
    dependencies_list: list[Dependency],
    items: list[InventoryItem],
    remotes: list[RemoteScript],
    top_finding: Finding | None,
    osv_result: OsvResult,
    invalid_manifests: list[str],
    submodules: list[str],
    coverage_dict: dict[str, int],
    suppressed: int,
) -> dict:
    """Build the serializable analysis report matching schemaVersion: 1."""
    install_data = [
        {
            "method": step.method,
            "command": step.command,
            "touches": step.touches,
            "source": step.source,
            "matchesDeclared": step.matches_declared,
        }
        for step in install_steps_list
    ]

    deps_data = [
        {
            "ecosystem": dep.ecosystem,
            "name": dep.name,
            "version": dep.version,
            "pinned": dep.pinned,
            "filePath": dep.file_path,
            "line": dep.line,
            "source": dep.source,
        }
        for dep in dependencies_list
    ]

    not_executed: list[dict[str, str]] = []
    for item in items:
        if item.language in {"python", "js", "shell", "powershell"}:
            not_executed.append(
                {
                    "path": item.path,
                    "reason": "La ejecución aislada todavía no está activa",
                }
            )
    for r in remotes:
        if r.content is not None:
            not_executed.append(
                {
                    "path": r.url,
                    "reason": "La ejecución aislada todavía no está activa",
                }
            )

    not_verifiable: list[str] = []

    distinct_deps = {(dep.ecosystem, dep.name) for dep in dependencies_list}
    if len(distinct_deps) == 1:
        not_verifiable.append(
            "No se revisó el código del paquete de terceros que instala; "
            "solo se buscó en la lista de problemas conocidos (OSV)."
        )
    elif len(distinct_deps) > 1:
        not_verifiable.append(
            f"No se revisó el código de los {len(distinct_deps)} paquetes de terceros que instala; "
            "solo se buscaron en la lista de problemas conocidos (OSV)."
        )

    if not osv_result.available:
        not_verifiable.append("No se pudo consultar OSV: no se sabe si los paquetes tienen problemas conocidos.")

    for manifest_path in invalid_manifests:
        not_verifiable.append(f"Manifiesto {manifest_path}: no se pudo leer.")

    for sub_path in submodules:
        not_verifiable.append(f"Submódulo {sub_path}: no se analizó.")

    for r in remotes:
        if r.content is None:
            reason = r.failure or "Error al descargar"
            not_verifiable.append(f"Script remoto {r.url}: {reason}")

    if remotes:
        not_verifiable.append("Que un script remoto haya cambiado desde el análisis.")

    text_files_count = len([it for it in items if it.kind != "binary"]) + len(
        [r for r in remotes if r.content is not None]
    )
    binary_files_count = len([it for it in items if it.kind == "binary"])

    steps = [
        {"label": "Reglas", "done": text_files_count, "total": text_files_count},
        {"label": "Explicación por IA", "done": 0, "total": text_files_count},
        {"label": "Descompilación", "done": 0, "total": binary_files_count},
        {"label": "Ejecución aislada", "done": 0, "total": len(not_executed)},
    ]

    top_finding_key = (
        f"{top_finding.rule_id}:{top_finding.file_path}:{top_finding.line}" if top_finding is not None else None
    )

    return {
        "schemaVersion": 1,
        "install": install_data,
        "dependencies": deps_data,
        "notExecuted": not_executed,
        "notVerifiable": not_verifiable,
        "steps": steps,
        "coverage": coverage_dict,
        "topFindingKey": top_finding_key,
        "suppressed": suppressed,
    }


__all__ = ["build_report"]
