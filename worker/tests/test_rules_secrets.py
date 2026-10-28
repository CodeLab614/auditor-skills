"""Tests for secrets rules: secrets.path, secrets.env, and secrets.env-dump."""

from auditor_worker.rules.secrets import scan_lines


def test_secrets_path_ssh() -> None:
    """Accessing ~/.ssh or id_rsa triggers secrets.path with matching path token."""
    line = "cat ~/.ssh/id_rsa"
    findings = scan_lines("leak.sh", "shell", [(1, line)])
    path_findings = [f for f in findings if f.rule_id == "secrets.path"]
    assert len(path_findings) >= 1
    tokens = {f.token for f in path_findings}
    assert "~/.ssh" in tokens
    assert path_findings[0].severity_undeclared == "high"
    assert path_findings[0].severity_declared == "high"


def test_secrets_path_one_per_line() -> None:
    """cat ~/.ssh/id_rsa triggers a single secrets.path finding with token ~/.ssh."""
    line = "cat ~/.ssh/id_rsa"
    findings = scan_lines("leak.sh", "shell", [(1, line)])
    path_findings = [f for f in findings if f.rule_id == "secrets.path"]
    assert len(path_findings) == 1
    assert path_findings[0].token == "~/.ssh"


def test_dotenv_example_is_not_secret() -> None:
    """.env.example, .env.sample, and .env.template are ignored, while real .env is reported."""
    neg_line = "cp .env.example .env.sample && cat .env.template"
    neg_findings = scan_lines("setup.sh", "shell", [(1, neg_line)])
    assert not any(f.rule_id == "secrets.path" for f in neg_findings)

    pos_line = 'with open(".env") as f:'
    pos_findings = scan_lines("config.py", "python", [(1, pos_line)])
    dot_findings = [f for f in pos_findings if f.rule_id == "secrets.path"]
    assert len(dot_findings) == 1
    assert dot_findings[0].token == ".env"


def test_dotenv_exclude_is_not_read() -> None:
    """Exclusion flags mentioning .env are not reported as reading secrets."""
    line = "--exclude='.env' \\"
    findings = scan_lines("build.sh", "shell", [(1, line)])
    assert not any(f.rule_id == "secrets.path" for f in findings)


def test_dotenv_startswith_is_not_read() -> None:
    """Filename matching checks using startswith are not reported as reading secrets."""
    line = 'if parts[-1].startswith(".env"): '
    findings = scan_lines("filter.py", "python", [(1, line)])
    assert not any(f.rule_id == "secrets.path" for f in findings)


def test_cat_dotenv_is_read() -> None:
    """cat .env in shell is reported as secrets.path reading .env."""
    line = "cat .env"
    findings = scan_lines("deploy.sh", "shell", [(1, line)])
    dot_findings = [f for f in findings if f.rule_id == "secrets.path" and f.token == ".env"]
    assert len(dot_findings) == 1


def test_load_dotenv_without_literal() -> None:
    """load_dotenv() in python triggers secrets.path with token .env without writing .env."""
    line = "load_dotenv()"
    findings = scan_lines("app.py", "python", [(1, line)])
    dot_findings = [f for f in findings if f.rule_id == "secrets.path" and f.token == ".env"]
    assert len(dot_findings) == 1


def test_secrets_env_python_getenv_token() -> None:
    """os.getenv reading an API_KEY variable extracts API_KEY as token."""
    line = 'api_key = os.getenv("API_KEY")'
    findings = scan_lines("auth.py", "python", [(1, line)])
    env_findings = [f for f in findings if f.rule_id == "secrets.env"]
    assert len(env_findings) == 1
    assert env_findings[0].token == "API_KEY"
    assert env_findings[0].severity_undeclared == "high"
    assert env_findings[0].severity_declared == "medium"

    # Near negative: reading non-secret environment variable
    neg_line = 'port = os.getenv("PORT")'
    neg_findings = scan_lines("auth.py", "python", [(1, neg_line)])
    assert not any(f.rule_id == "secrets.env" for f in neg_findings)


def test_secrets_env_shell_braces() -> None:
    """Shell ${VARIABLE} reading secret variable name extracts token."""
    line = 'echo "${AWS_SECRET_ACCESS_KEY}"'
    findings = scan_lines("deploy.sh", "shell", [(1, line)])
    env_findings = [f for f in findings if f.rule_id == "secrets.env"]
    assert len(env_findings) == 1
    assert env_findings[0].token == "AWS_SECRET_ACCESS_KEY"

    # Near negative: non-secret variable
    neg_line = 'echo "${BUILD_OUTPUT_DIR}"'
    neg_findings = scan_lines("deploy.sh", "shell", [(1, neg_line)])
    assert not any(f.rule_id == "secrets.env" for f in neg_findings)


def test_env_passthrough_is_not_dump() -> None:
    """Passing os.environ as env argument to subprocess does not count as env dump."""
    line = 'subprocess.run(["make"], env=os.environ)'
    findings = scan_lines("build.py", "python", [(1, line)])
    assert not any(f.rule_id == "secrets.env-dump" for f in findings)


def test_printenv_dump() -> None:
    """printenv without arguments is reported as secrets.env-dump."""
    pos_line = "printenv | grep SECRET"
    findings = scan_lines("dump.sh", "shell", [(1, pos_line)])
    dump_findings = [f for f in findings if f.rule_id == "secrets.env-dump"]
    assert len(dump_findings) == 1
    assert dump_findings[0].token is None
    assert dump_findings[0].severity_undeclared == "high"
    assert dump_findings[0].severity_declared == "high"

    # Near negative: printenv with specific variable argument
    neg_line = "printenv USER"
    neg_findings = scan_lines("dump.sh", "shell", [(1, neg_line)])
    assert not any(f.rule_id == "secrets.env-dump" for f in neg_findings)


def test_env_copy_for_subprocess_is_not_dump() -> None:
    """Copying or filtering os.environ for a subprocess is not considered an environment dump."""
    line = 'env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}'
    findings = scan_lines("run.py", "python", [(1, line)])
    assert not any(f.rule_id == "secrets.env-dump" for f in findings)
