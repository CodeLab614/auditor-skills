"""Shared regular expressions and extraction helpers for the rule engine."""

import re
from urllib.parse import urlsplit

# URL matching: https?:// without whitespace, quotes, angle brackets, or trailing parenthesis
URL_RE = re.compile(r"https?://[^\s\"'<>]*[^\s\"'<>()]")

# Secret file paths defined in the design table
SECRET_PATHS: tuple[str, ...] = (
    "~/.ssh",
    "id_rsa",
    "id_ed25519",
    "~/.aws",
    "~/.config/gh",
    ".git-credentials",
    ".netrc",
    ".npmrc",
    ".pypirc",
    "~/.docker/config.json",
    "~/.kube/config",
    "security find-generic-password",
)

# .env must be a complete filename, not within a word, not followed by .example, .sample, or .template
DOTENV_RE = re.compile(r"(?<![A-Za-z0-9_])\.env(?!\.(?:example|sample|template)\b)(?![A-Za-z0-9_])")

# Secret environment variable keywords (case-insensitive)
SECRET_ENV_KEYWORDS: tuple[str, ...] = (
    "TOKEN",
    "SECRET",
    "PASSWORD",
    "PASSWD",
    "API_KEY",
    "APIKEY",
    "ACCESS_KEY",
    "PRIVATE_KEY",
    "CREDENTIAL",
)

SECRET_ENV_NAME_RE = re.compile(
    r"(?i)(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|APIKEY|ACCESS_KEY|PRIVATE_KEY|CREDENTIAL)"
)

# Outside path prefixes and expressions
OUTSIDE_PATH_PREFIXES: tuple[str, ...] = (
    "/",
    "~",
    "$HOME",
    "${HOME}",
    "%USERPROFILE%",
    "$env:USERPROFILE",
)

OUTSIDE_PATH_EXPRESSIONS: tuple[str, ...] = (
    "Path.home()",
    'os.path.expanduser("~',
    "os.path.expanduser('~",
    "os.homedir()",
    "homedir()",
)

EXCLUDED_PATH_PREFIXES: tuple[str, ...] = (
    "/dev/null",
    "/dev/stdout",
    "/dev/stderr",
    "/tmp/",  # noqa: S108 - excluded prefix, not a temp file
    "$TMPDIR",
    "%TEMP%",
)

# System persistence paths defined in the design table
PERSISTENCE_PATHS: tuple[str, ...] = (
    ".bashrc",
    ".zshrc",
    ".profile",
    ".bash_profile",
    ".zprofile",
    "config.fish",
    "crontab",
    "LaunchAgents",
    "LaunchDaemons",
    "systemd",
    ".git/hooks",
    "core.hooksPath",
    "~/.claude/",
    "~/.codex/",
    "~/.cursor/",
)

# System persistence commands
PERSISTENCE_COMMANDS: tuple[str, ...] = (
    "launchctl load",
    "launchctl bootstrap",
    "systemctl --user enable",
    "systemctl enable",
    "git config --global core.hooksPath",
    "git config core.hooksPath",
    "crontab",
)

# Obfuscated large data blob patterns (>= 200 chars base64 or hex)
BLOB_BASE64_RE = re.compile(r"[A-Za-z0-9+/]{200,}={0,2}")
BLOB_HEX_RE = re.compile(r"[0-9a-fA-F]{200,}")

# Documentation placeholder pattern: <identifier>
DOC_PLACEHOLDER_RE = re.compile(r"<[A-Za-z][A-Za-z0-9_ .-]*>")


def is_excluded_path(path: str) -> bool:
    """Check if path is in the excluded safe prefixes (/dev/null, /tmp, etc.)."""
    cleaned = path.strip("'\"")
    if cleaned in {"/tmp", "$TMPDIR", "%TEMP%"}:  # noqa: S108 - excluded prefix, not a temp file
        return True
    return any(cleaned.startswith(prefix) for prefix in EXCLUDED_PATH_PREFIXES)


def is_outside_path(s: str) -> bool:
    """Check whether a path literal points outside the skill directory."""
    cleaned = s.strip("'\"")
    if not cleaned or is_excluded_path(cleaned):
        return False
    if "../" in cleaned or cleaned == "..":
        return True
    return any(cleaned.startswith(prefix) for prefix in OUTSIDE_PATH_PREFIXES)


def host_of(url: str) -> str | None:
    """Extract lowercase host without port from a URL."""
    try:
        parsed = urlsplit(url)
        host = parsed.hostname
        if host:
            return host.lower()
        return None
    except Exception:
        return None


def is_secret_env_name(name: str) -> bool:
    """Check if an environment variable name contains any secret keywords case-insensitively."""
    upper = name.upper()
    return any(kw in upper for kw in SECRET_ENV_KEYWORDS)


def sanitize_placeholders(line: str) -> str:
    """Replace documentation placeholders like <skill-dir> with PLACEHOLDER."""
    return DOC_PLACEHOLDER_RE.sub("PLACEHOLDER", line)


def mask_shell_redirects(line: str) -> str:
    """Mask '>' and '<' characters inside quotes or after '://' in URLs."""
    in_single = False
    in_double = False
    in_url = False
    escaped = False
    chars = list(line)
    n = len(chars)
    i = 0

    while i < n:
        ch = chars[i]
        if escaped:
            escaped = False
            i += 1
            continue

        if ch == "\\" and not in_single:
            escaped = True
            i += 1
            continue

        if ch == "'" and not in_double:
            in_single = not in_single
            if in_url:
                in_url = False
            i += 1
            continue

        if ch == '"' and not in_single:
            in_double = not in_double
            if in_url:
                in_url = False
            i += 1
            continue

        if not in_single and not in_double:
            if not in_url:
                if ch == ":" and i + 2 < n and chars[i + 1] == "/" and chars[i + 2] == "/":
                    in_url = True
                    i += 3
                    continue
            elif ch in " \t\r\n;&|":
                in_url = False

        if (in_single or in_double or in_url) and ch in "><":
            chars[i] = " "

        i += 1

    return "".join(chars)


__all__ = [
    "BLOB_BASE64_RE",
    "BLOB_HEX_RE",
    "DOC_PLACEHOLDER_RE",
    "DOTENV_RE",
    "EXCLUDED_PATH_PREFIXES",
    "OUTSIDE_PATH_EXPRESSIONS",
    "OUTSIDE_PATH_PREFIXES",
    "PERSISTENCE_COMMANDS",
    "PERSISTENCE_PATHS",
    "SECRET_ENV_KEYWORDS",
    "SECRET_ENV_NAME_RE",
    "SECRET_PATHS",
    "URL_RE",
    "host_of",
    "is_excluded_path",
    "is_outside_path",
    "is_secret_env_name",
    "mask_shell_redirects",
    "sanitize_placeholders",
]
