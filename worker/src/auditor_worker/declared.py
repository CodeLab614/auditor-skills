"""Declaration matching for findings against SKILL.md."""

from auditor_worker.findings import Finding


def _strip_html_comments(text: str) -> str:
    parts: list[str] = []
    idx = 0
    while idx < len(text):
        start = text.find("<!--", idx)
        if start == -1:
            parts.append(text[idx:])
            break
        parts.append(text[idx:start])
        end = text.find("-->", start + 4)
        if end == -1:
            break
        idx = end + 3
    return "".join(parts)


def apply_declared(findings: list[Finding], skill_md: str) -> None:
    """Apply declaration status and adjusted severity to findings based on SKILL.md content."""
    clean_skill_md = _strip_html_comments(skill_md)
    skill_md_lower = clean_skill_md.lower()

    for f in findings:
        if f.token and f.token.strip():
            f.declared = f.token.lower() in skill_md_lower
        else:
            f.declared = False

        if f.rule_id == "install.remote-script":
            f.severity = f.severity_undeclared
        else:
            f.severity = f.severity_declared if f.declared else f.severity_undeclared


__all__ = ["apply_declared"]
