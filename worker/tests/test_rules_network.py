"""Tests for network rules: net.http, net.dynamic, and net.dns."""

from auditor_worker.rules.network import scan_lines


def test_net_http_extracts_domain() -> None:
    """requests.get extracts lowercase host as token and full URL."""
    line = 'response = requests.get("https://api.example.com/x")'
    findings = scan_lines("app.py", "python", [(1, line)])
    http_findings = [f for f in findings if f.rule_id == "net.http"]
    assert len(http_findings) == 1
    assert http_findings[0].token == "api.example.com"
    assert http_findings[0].url == "https://api.example.com/x"
    assert http_findings[0].severity_undeclared == "high"
    assert http_findings[0].severity_declared == "medium"

    # Near negative: URL alone without network call in python does not trigger net.http
    neg_line = 'endpoint = "https://api.example.com/x"'
    neg_findings = scan_lines("app.py", "python", [(1, neg_line)])
    assert not any(f.rule_id == "net.http" for f in neg_findings)


def test_net_http_in_python_comment_counts() -> None:
    """Network calls inside comments are also reported."""
    line = '# requests.get("https://api.example.com/x")'
    findings = scan_lines("app.py", "python", [(1, line)])
    http_findings = [f for f in findings if f.rule_id == "net.http"]
    assert len(http_findings) == 1
    assert http_findings[0].token == "api.example.com"


def test_net_dynamic_fetch_variable() -> None:
    """fetch(variable) triggers net.dynamic with no token."""
    line = "const res = await fetch(customEndpoint);"
    findings = scan_lines("client.js", "js", [(1, line)])
    dynamic_findings = [f for f in findings if f.rule_id == "net.dynamic"]
    assert len(dynamic_findings) == 1
    assert dynamic_findings[0].token is None
    assert dynamic_findings[0].severity_undeclared == "high"
    assert dynamic_findings[0].severity_declared == "high"

    # Near negative: variable named fetch_url without function call
    neg_line = "const fetch_url = true;"
    neg_findings = scan_lines("client.js", "js", [(1, neg_line)])
    assert not any(f.rule_id == "net.dynamic" for f in neg_findings)


def test_net_dns_dig_host() -> None:
    """dig example.com extracts example.com as host token."""
    line = "dig example.com +short"
    findings = scan_lines("lookup.sh", "shell", [(1, line)])
    dns_findings = [f for f in findings if f.rule_id == "net.dns"]
    assert len(dns_findings) == 1
    assert dns_findings[0].token == "example.com"
    assert dns_findings[0].severity_undeclared == "high"
    assert dns_findings[0].severity_declared == "medium"

    # Near negative: word digital does not trigger DNS call
    neg_line = "digital_output = 42"
    neg_findings = scan_lines("lookup.sh", "shell", [(1, neg_line)])
    assert not any(f.rule_id == "net.dns" for f in neg_findings)


def test_net_dynamic_socket_connection() -> None:
    """socket.socket connection is detected as net.dynamic."""
    pos_line = "s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)"
    findings = scan_lines("server.py", "python", [(1, pos_line)])
    assert any(f.rule_id == "net.dynamic" for f in findings)

    # Near negative: string mentioning socket without call
    neg_line = 'mode = "socket.socket"'
    neg_findings = scan_lines("server.py", "python", [(1, neg_line)])
    assert not any(f.rule_id == "net.dynamic" for f in neg_findings)


def test_net_dns_python_gethostbyname() -> None:
    """gethostbyname with literal string extracts host token."""
    pos_line = 'ip = socket.gethostbyname("test.org")'
    findings = scan_lines("lookup.py", "python", [(1, pos_line)])
    dns_findings = [f for f in findings if f.rule_id == "net.dns"]
    assert len(dns_findings) == 1
    assert dns_findings[0].token == "test.org"

    # Dynamic lookup without literal string leaves token None
    dyn_line = "ip = socket.gethostbyname(target)"
    dyn_findings = scan_lines("lookup.py", "python", [(1, dyn_line)])
    dns_dyn = [f for f in dyn_findings if f.rule_id == "net.dns"]
    assert len(dns_dyn) == 1
    assert dns_dyn[0].token is None


def test_relative_fetch_is_not_network() -> None:
    """Relative fetch path to the application itself does not trigger net.dynamic."""
    rel_line = "const response = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`);"
    findings = scan_lines("user.js", "js", [(1, rel_line)])
    assert not any(f.rule_id == "net.dynamic" for f in findings)

    dyn_line = "const response = await fetch(url);"
    dyn_findings = scan_lines("user.js", "js", [(1, dyn_line)])
    assert any(f.rule_id == "net.dynamic" for f in dyn_findings)
