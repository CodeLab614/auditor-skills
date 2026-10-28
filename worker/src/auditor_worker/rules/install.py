"""Installation rules: install.package and install.remote-script."""

import re

from auditor_worker.findings import Finding, make_evidence
from auditor_worker.rules.patterns import URL_RE, host_of

PKG_MANAGERS: list[str] = [
    "python3 -m pip install",
    "python -m pip install",
    "apt-get install",
    "pip3 install",
    "pip install",
    "uv pip install",
    "uv add",
    "uvx",
    "pipx run",
    "pipx install",
    "pnpm dlx",
    "pnpm install",
    "pnpm add",
    "npm install",
    "npm add",
    "npm i",
    "yarn dlx",
    "yarn add",
    "bun install",
    "bun add",
    "npx",
    "bunx",
    "brew install",
    "apt install",
    "gem install",
    "cargo install",
    "go install",
]

# Match package manager command prefix
PKG_CMD_RE = re.compile(r"(?<![A-Za-z0-9_\-])(?:" + "|".join(re.escape(cmd) for cmd in PKG_MANAGERS) + r")(?:\s+|$)")
SINGLE_PKG_MANAGERS: set[str] = {"npx", "bunx", "uvx", "pipx run", "pnpm dlx", "yarn dlx"}
SKILL_RUNNERS: set[str] = {"npx", "bunx", "pnpm dlx", "yarn dlx"}

FLAG_WITH_ARG: set[str] = {
    "-r",
    "-c",
    "-i",
    "-t",
    "-e",
    "-b",
    "--requirement",
    "--constraint",
    "--index-url",
    "--extra-index-url",
    "--target",
    "--prefix",
}

CMD_SPLIT_RE = re.compile(r";|&&|\|\|")
UNIX_DOWNLOAD_RE = re.compile(r"\b(?:curl|wget)\b")
UNIX_PIPE_TARGET_RE = re.compile(r"^(?:sudo\s+(?:-E\s+)?)?(?:sh|bash|zsh|dash|ksh|python3?)\b")
PS_DOWNLOAD_RE = re.compile(r"\b(?:iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b", re.IGNORECASE)
PS_PIPE_TARGET_RE = re.compile(r"^(?:iex|Invoke-Expression)\b", re.IGNORECASE)
SUBST_PATTERNS = [
    re.compile(r"\b(?:sh|bash|zsh)\s+<\(\s*(?:curl|wget)\b"),
    re.compile(r"""\b(?:sh|bash)\s+-c\s+["']?\$\(\s*(?:curl|wget)\b"""),
]


def _has_remote_script(line: str) -> bool:
    if any(p.search(line) is not None for p in SUBST_PATTERNS):
        return True

    commands = CMD_SPLIT_RE.split(line)
    for cmd in commands:
        if "|" not in cmd:
            continue
        stages = cmd.split("|")
        for i in range(len(stages) - 1):
            curr = stages[i]
            next_target = stages[i + 1].strip()
            if UNIX_DOWNLOAD_RE.search(curr) and UNIX_PIPE_TARGET_RE.match(next_target):
                return True
            if PS_DOWNLOAD_RE.search(curr) and PS_PIPE_TARGET_RE.match(next_target):
                return True
    return False


def _is_valid_package_token(token: str) -> bool:
    """Discard packages containing $, (, ), {, }, <, >, `, or = (except pip ==)."""
    if not token:
        return False
    for ch in ("$", "(", ")", "{", "}", "<", ">", "`"):
        if ch in token:
            return False
    if "=" in token:
        if token.count("=") != 2 or "==" not in token:
            return False
        parts = token.split("==", 1)
        if not parts[0] or not parts[1]:
            return False
        for ch in ("$", "(", ")", "{", "}", "<", ">", "`"):
            if ch in parts[0] or ch in parts[1]:
                return False
    return True


def parse_package_spec(arg: str) -> tuple[str, str | None]:
    """Parse package name and pinned version from a package argument."""
    arg = arg.strip("'\"")
    if not arg:
        return ("", None)
    if "==" in arg:
        parts = arg.split("==", 1)
        return parts[0], parts[1] if parts[1] else None
    for op in (">=", "<=", "!=", "~=", ">", "<"):
        if op in arg:
            parts = arg.split(op, 1)
            return parts[0], None
    if arg.startswith("@"):
        rest = arg[1:]
        if "@" in rest:
            pkg_part, ver_part = rest.split("@", 1)
            return f"@{pkg_part}", ver_part if ver_part else None
        return arg, None
    if "@" in arg:
        pkg_part, ver_part = arg.split("@", 1)
        return pkg_part, ver_part if ver_part else None
    return arg, None


def _split_shell_tokens(s: str) -> list[str]:
    return re.findall(r"""(?:[^\s"']+|"[^"]*"|'[^']*')+""", s)


def _resolve_ecosystem(cmd: str) -> str | None:
    if (
        cmd.startswith("pip")
        or cmd.startswith("python -m pip")
        or cmd.startswith("python3 -m pip")
        or cmd.startswith("uv")
        or cmd.startswith("pipx")
    ):
        return "PyPI"
    if (
        cmd.startswith("npm")
        or cmd.startswith("pnpm")
        or cmd.startswith("yarn")
        or cmd.startswith("bun")
        or cmd.startswith("npx")
        or cmd.startswith("bunx")
    ):
        return "npm"
    if cmd.startswith("gem"):
        return "RubyGems"
    if cmd.startswith("cargo"):
        return "crates.io"
    if cmd.startswith("go install"):
        return "Go"
    return None


def scan_lines(path: str, language: str, lines: list[tuple[int, str]]) -> list[Finding]:
    """Scan lines for install.package and install.remote-script rules."""
    findings: list[Finding] = []
    can_check_packages = language not in {"config", "other", None}
    seen_pkg_findings: set[tuple[str | None, int]] = set()

    for line_no, line in lines:
        evidence = make_evidence(line)

        # 1. install.remote-script: remote download piped to execution
        if _has_remote_script(line):
            url_match = URL_RE.search(line)
            url = url_match.group(0) if url_match else None
            host = host_of(url) if url else None
            title = (
                f"Descarga y ejecución remota de script desde {host}"
                if host
                else "Descarga y ejecución remota de script"
            )
            findings.append(
                Finding(
                    rule_id="install.remote-script",
                    category="install",
                    severity_undeclared="critical",
                    severity_declared="critical",
                    file_path=path,
                    line=line_no,
                    title=title,
                    evidence=evidence,
                    token=None,
                    url=url,
                    version=None,
                )
            )

        # 2. install.package: package manager invocations
        if not can_check_packages:
            continue

        cmd_match = PKG_CMD_RE.search(line)
        if cmd_match:
            matched_cmd = cmd_match.group(0).strip()
            ecosystem = _resolve_ecosystem(matched_cmd)
            is_single_pkg = matched_cmd in SINGLE_PKG_MANAGERS
            is_skill_runner = matched_cmd in SKILL_RUNNERS
            is_skill_installer = False
            remainder = re.split(r"[;&|]", line[cmd_match.end() :])[0]
            packages: list[tuple[str, str | None]] = []
            skip_next = False

            for m in re.finditer(r"""(?:[^\s"']+|"[^"]*"|'[^']*')+""", remainder):
                clean_tok = m.group(0).strip("'\"")
                if ">" in clean_tok or "<" in clean_tok:
                    break
                if skip_next:
                    skip_next = False
                    continue
                if clean_tok in FLAG_WITH_ARG:
                    skip_next = True
                    continue
                if clean_tok.startswith("-"):
                    continue

                if not _is_valid_package_token(clean_tok):
                    continue

                name, ver = parse_package_spec(clean_tok)
                if name:
                    if is_skill_runner and name == "skills":
                        is_skill_installer = True
                        break
                    packages.append((name, ver))
                    if is_single_pkg or len(packages) >= 20:
                        break

            if is_skill_installer:
                continue

            if packages:
                for name, ver in packages:
                    key = (name, line_no)
                    if key in seen_pkg_findings:
                        continue
                    seen_pkg_findings.add(key)
                    findings.append(
                        Finding(
                            rule_id="install.package",
                            category="install",
                            severity_undeclared="high",
                            severity_declared="low",
                            file_path=path,
                            line=line_no,
                            title=f"Instalación del paquete {name}",
                            evidence=evidence,
                            token=name,
                            url=None,
                            version=ver,
                            ecosystem=ecosystem,
                        )
                    )
            else:
                key = (None, line_no)
                if key not in seen_pkg_findings:
                    seen_pkg_findings.add(key)
                    findings.append(
                        Finding(
                            rule_id="install.package",
                            category="install",
                            severity_undeclared="high",
                            severity_declared="low",
                            file_path=path,
                            line=line_no,
                            title="Instalación de paquetes",
                            evidence=evidence,
                            token=None,
                            url=None,
                            version=None,
                            ecosystem=ecosystem,
                        )
                    )

    return findings


__all__ = ["parse_package_spec", "scan_lines"]
