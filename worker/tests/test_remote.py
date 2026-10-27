"""Tests for remote script collection and download limits."""

from auditor_worker.fetch import FetchResult
from auditor_worker.findings import Finding
from auditor_worker.remote import collect_remote_scripts


def test_collect_dedup_and_max_5() -> None:
    urls = [
        "https://example.com/1.sh",
        "https://example.com/2.sh",
        "https://example.com/1.sh",  # duplicate 1
        "https://example.com/3.sh",
        "https://example.com/4.sh",
        "https://example.com/2.sh",  # duplicate 2
        "https://example.com/5.sh",
        "https://example.com/6.sh",
        "https://example.com/7.sh",
    ]
    findings = [
        Finding(
            rule_id="install.remote-script",
            category="install",
            severity_undeclared="critical",
            severity_declared="critical",
            file_path="README.md",
            line=idx,
            title="Remote script",
            evidence="curl ...",
            url=url,
        )
        for idx, url in enumerate(urls, start=1)
    ]

    fetched_urls: list[str] = []

    def mock_fetcher(url: str) -> FetchResult:
        fetched_urls.append(url)
        return FetchResult(status="ok", data=f"echo {url}\n".encode(), final_url=url, reason=None)

    scripts = collect_remote_scripts(findings, mock_fetcher)
    assert len(scripts) == 5
    assert len(fetched_urls) == 5
    assert fetched_urls == [
        "https://example.com/1.sh",
        "https://example.com/2.sh",
        "https://example.com/3.sh",
        "https://example.com/4.sh",
        "https://example.com/5.sh",
    ]
    for script in scripts:
        assert script.content is not None
        assert script.sha256 is not None
        assert script.downloaded_at is not None
        assert script.failure is None


def test_collect_failure_recorded() -> None:
    finding = Finding(
        rule_id="install.remote-script",
        category="install",
        severity_undeclared="critical",
        severity_declared="critical",
        file_path="SKILL.md",
        line=1,
        title="Remote script",
        evidence="curl ...",
        url="https://blocked.example.com/script.sh",
    )

    def failing_fetcher(url: str) -> FetchResult:
        return FetchResult(
            status="blocked",
            data=None,
            final_url=url,
            reason="La dirección IP no es pública o está restringida",
        )

    scripts = collect_remote_scripts([finding], failing_fetcher)
    assert len(scripts) == 1
    script = scripts[0]
    assert script.url == "https://blocked.example.com/script.sh"
    assert script.content is None
    assert script.sha256 is None
    assert script.downloaded_at is None
    assert script.failure == "La dirección IP no es pública o está restringida"


def test_collect_ignores_findings_without_url() -> None:
    findings = [
        Finding(
            rule_id="install.remote-script",
            category="install",
            severity_undeclared="critical",
            severity_declared="critical",
            file_path="SKILL.md",
            line=1,
            title="Remote script without url",
            evidence="curl ...",
            url=None,
        ),
        Finding(
            rule_id="install.package",
            category="install",
            severity_undeclared="high",
            severity_declared="low",
            file_path="SKILL.md",
            line=2,
            title="Package",
            evidence="pip install foo",
            token="foo",
            url="https://pypi.org/project/foo/",
        ),
    ]

    called = False

    def mock_fetcher(url: str) -> FetchResult:
        nonlocal called
        called = True
        return FetchResult(status="ok", data=b"", final_url=url, reason=None)

    scripts = collect_remote_scripts(findings, mock_fetcher)
    assert len(scripts) == 0
    assert not called
