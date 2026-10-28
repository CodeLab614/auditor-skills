"""Installation analysis, remote script classification, and install step generator."""

import json
import urllib.parse
from dataclasses import dataclass
from typing import Literal

from auditor_worker.findings import Finding, Severity
from auditor_worker.inventory import InventoryItem
from auditor_worker.rules import markdown_code_lines, scan
from auditor_worker.snapshot import Snapshot, git_blob_sha

# Every change to this list must go through a pull request and review.
KNOWN_INSTALLERS: tuple[str, ...] = (
    "bun.sh/install",
    "deno.land/install.sh",
    "sh.rustup.rs",
    "astral.sh/uv/install.sh",
    "get.pnpm.io/install.sh",
    "raw.githubusercontent.com/Homebrew/install/HEAD/install.sh",
)


def classify_remote(url: str | None, owner: str, repo: str) -> tuple[str, Severity]:
    """Classify a remote script URL and determine its default severity."""
    if not url:
        return ("other", "critical")

    parsed = urllib.parse.urlsplit(url)
    if (parsed.scheme or "").lower() != "https":
        return ("other", "critical")

    host = (parsed.hostname or "").lower()
    if not host:
        return ("other", "critical")

    host_path = f"{host}{parsed.path}"
    if any(host_path.startswith(prefix) for prefix in KNOWN_INSTALLERS):
        return ("known-installer", "medium")

    parts = [p for p in parsed.path.strip("/").split("/") if p]
    if host == "raw.githubusercontent.com":
        if len(parts) >= 3 and parts[0].lower() == owner.lower() and parts[1].lower() == repo.lower():
            ref = parts[2]
            is_sha = len(ref) == 40 and all(c in "0123456789abcdefABCDEF" for c in ref)
            if is_sha:
                return ("same-repo-commit", "low")
            return ("same-repo-ref", "medium")
    elif host == "github.com":
        if (
            len(parts) >= 4
            and parts[0].lower() == owner.lower()
            and parts[1].lower() == repo.lower()
            and parts[2].lower() == "raw"
        ):
            ref = parts[3]
            is_sha = len(ref) == 40 and all(c in "0123456789abcdefABCDEF" for c in ref)
            if is_sha:
                return ("same-repo-commit", "low")
            return ("same-repo-ref", "medium")

    return ("other", "critical")


def apply_remote_severity(findings: list[Finding], owner: str, repo: str) -> None:
    """Apply classified remote severity to install.remote-script findings in place."""
    for f in findings:
        if f.rule_id == "install.remote-script":
            _, sev = classify_remote(f.url, owner, repo)
            f.severity_undeclared = sev
            f.severity_declared = sev


def readme_findings(snapshot: Snapshot) -> list[Finding]:
    """Scan all README files in snapshot and return only install.* findings."""
    all_findings: list[Finding] = []
    for readme_path, data in snapshot.readmes.items():
        if readme_path in snapshot.files:
            continue
        text = data.decode("utf-8", errors="replace")
        item = InventoryItem(
            path=readme_path,
            blob_sha=git_blob_sha(data),
            byte_size=len(data),
            kind="markdown",
            language="markdown",
            line_count=len(text.splitlines()),
            flags=[],
        )
        kept, _ = scan(item, text)
        for f in kept:
            if f.rule_id.startswith("install."):
                f.file_path = readme_path
                all_findings.append(f)
    return all_findings


@dataclass
class InstallContext:
    display_owner: str
    display_repo: str
    skill_name: str
    skill_path: str
    plugin_name: str | None


@dataclass
class InstallStep:
    method: Literal["folder", "plugin", "readme"]
    command: str
    touches: str
    source: str | None
    matches_declared: bool


def plugin_name_for(snapshot: Snapshot, skill_path: str) -> str | None:
    """Find the plugin name from the nearest ancestor folder containing .claude-plugin/plugin.json."""
    current = skill_path.strip("/")
    while True:
        candidate = f"{current}/.claude-plugin/plugin.json" if current else ".claude-plugin/plugin.json"
        if candidate in snapshot.files:
            try:
                data = json.loads(snapshot.files[candidate].decode("utf-8", errors="replace"))
                if isinstance(data, dict):
                    name = data.get("name")
                    if isinstance(name, str) and name.strip():
                        return name
            except Exception:
                return None
            return None
        if not current:
            break
        if "/" in current:
            current = current.rsplit("/", 1)[0]
        else:
            current = ""
    return None


def install_steps(
    ctx: InstallContext,
    snapshot: Snapshot,
    readme_findings: list[Finding],
) -> list[InstallStep]:
    """Build the ordered list of installation steps for the skill."""
    steps: list[InstallStep] = []

    if ctx.skill_path:
        folder_touches = f"Copia la carpeta `{ctx.skill_path}` en la carpeta de skills del agente"
    else:
        folder_touches = "Copia la carpeta (raíz del repositorio) en la carpeta de skills del agente"

    steps.append(
        InstallStep(
            method="folder",
            command=f"npx skills add {ctx.display_owner}/{ctx.display_repo} --skill {ctx.skill_name}",
            touches=folder_touches,
            source=None,
            matches_declared=True,
        )
    )

    if ctx.plugin_name:
        steps.append(
            InstallStep(
                method="plugin",
                command=f"/plugin install {ctx.plugin_name}",
                touches="Activa los hooks, comandos, agentes y MCP del plugin",
                source=None,
                matches_declared=True,
            )
        )

    seen_commands: set[str] = set()
    for readme_path, data in snapshot.readmes.items():
        text = data.decode("utf-8", errors="replace")
        for line_no, raw_cmd, _ in markdown_code_lines(text):
            stripped = raw_cmd.strip()
            command = stripped[:300]
            if not command:
                continue

            line_findings = [f for f in readme_findings if f.file_path == readme_path and f.line == line_no]
            is_git_clone = stripped.startswith("git clone ")
            is_cp = stripped.startswith("cp ")

            if not (line_findings or is_git_clone or is_cp):
                continue

            if command in seen_commands:
                continue
            seen_commands.add(command)

            touch_parts: list[str] = []
            has_remote = any(f.rule_id == "install.remote-script" for f in line_findings)
            if has_remote:
                touch_parts.append("Descarga y ejecuta un script remoto")

            pkg_tokens: list[str] = []
            has_pkg = False
            for f in line_findings:
                if f.rule_id == "install.package":
                    has_pkg = True
                    if f.token and f.token not in pkg_tokens:
                        pkg_tokens.append(f.token)
            if has_pkg:
                if pkg_tokens:
                    touch_parts.append(f"Instala paquetes: {', '.join(pkg_tokens)}")
                else:
                    touch_parts.append("Instala paquetes")

            if is_git_clone:
                touch_parts.append("Clona un repositorio")
            if is_cp:
                touch_parts.append("Copia archivos")

            touches = "; ".join(touch_parts)
            matches_declared = all(f.declared for f in line_findings)

            steps.append(
                InstallStep(
                    method="readme",
                    command=command,
                    touches=touches,
                    source=f"{readme_path}:{line_no}",
                    matches_declared=matches_declared,
                )
            )

    return steps


__all__ = [
    "KNOWN_INSTALLERS",
    "InstallContext",
    "InstallStep",
    "apply_remote_severity",
    "classify_remote",
    "install_steps",
    "plugin_name_for",
    "readme_findings",
]
