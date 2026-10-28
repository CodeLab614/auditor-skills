"""Remote script collection and download orchestration."""

import hashlib
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime

from auditor_worker.fetch import FetchResult
from auditor_worker.findings import Finding

MAX_REMOTE_SCRIPTS = 5


@dataclass
class RemoteScript:
    """A collected remote script and its download outcome."""

    url: str
    content: bytes | None
    sha256: str | None
    downloaded_at: datetime | None
    failure: str | None


def download_urls(
    urls: list[str],
    fetcher: Callable[[str], FetchResult],
) -> list[RemoteScript]:
    """Download unique remote scripts in order up to MAX_REMOTE_SCRIPTS."""
    seen_urls: set[str] = set()
    scripts: list[RemoteScript] = []

    for url in urls:
        if not url:
            continue
        if url in seen_urls:
            continue
        seen_urls.add(url)

        if len(scripts) >= MAX_REMOTE_SCRIPTS:
            break

        res = fetcher(url)
        if res.status == "ok" and res.data is not None:
            content = res.data
            sha = hashlib.sha256(content).hexdigest()
            scripts.append(
                RemoteScript(
                    url=url,
                    content=content,
                    sha256=sha,
                    downloaded_at=datetime.now(UTC),
                    failure=None,
                )
            )
        else:
            scripts.append(
                RemoteScript(
                    url=url,
                    content=None,
                    sha256=None,
                    downloaded_at=None,
                    failure=res.reason,
                )
            )

    return scripts


def collect_remote_scripts(
    findings: list[Finding],
    fetcher: Callable[[str], FetchResult],
) -> list[RemoteScript]:
    """Collect and download unique remote scripts discovered in findings up to MAX_REMOTE_SCRIPTS.

    Depth 1 recursion limit is guaranteed by the caller, who must never pass
    findings extracted from previously downloaded remote scripts.
    """
    urls: list[str] = [f.url for f in findings if f.rule_id == "install.remote-script" and f.url]
    return download_urls(urls, fetcher)


__all__ = ["MAX_REMOTE_SCRIPTS", "RemoteScript", "collect_remote_scripts", "download_urls"]
