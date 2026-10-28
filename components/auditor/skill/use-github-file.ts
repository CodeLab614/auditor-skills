"use client";

import { useEffect, useState } from "react";
import { gitBlobSha } from "@/lib/auditor/git-blob";
import type { SkillFile } from "@/lib/auditor/types";

export type GithubFileStatus =
  | "idle"
  | "loading"
  | "available"
  | "gone"
  | "sha-mismatch"
  | "error";

export interface GithubFileResult {
  status: GithubFileStatus;
  lines: string[];
}

export function useGithubFile(
  file: SkillFile,
  owner: string,
  repo: string,
): GithubFileResult {
  const shouldSkip =
    file.lines.length > 0 ||
    file.source === "remote" ||
    file.availability === "binary" ||
    !file.blobSha ||
    !file.commit;

  const key = `${owner}/${repo}/${file.commit}/${file.path}/${file.blobSha}`;

  const [state, setState] = useState<{
    key: string;
    result: GithubFileResult;
  } | null>(null);

  useEffect(() => {
    if (shouldSkip) {
      return;
    }

    const controller = new AbortController();

    async function fetchFile() {
      try {
        const pathSegments = file.path
          .split("/")
          .map((segment) => encodeURIComponent(segment))
          .join("/");
        const encodedOwner = encodeURIComponent(owner);
        const encodedRepo = encodeURIComponent(repo);
        const encodedCommit = encodeURIComponent(file.commit!);
        const url =
          `https://raw.githubusercontent.com/${encodedOwner}/${encodedRepo}/${encodedCommit}/${pathSegments}`;

        const response = await fetch(url, { signal: controller.signal });

        if (response.status === 404) {
          setState({ key, result: { status: "gone", lines: [] } });
          return;
        }

        if (!response.ok) {
          setState({ key, result: { status: "error", lines: [] } });
          return;
        }

        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const sha = await gitBlobSha(bytes);

        if (sha !== file.blobSha) {
          setState({ key, result: { status: "sha-mismatch", lines: [] } });
          return;
        }

        const text = new TextDecoder("utf-8").decode(bytes);
        let lines: string[];
        if (text.length === 0) {
          lines = [];
        } else if (text.endsWith("\n")) {
          lines = text.slice(0, -1).split("\n");
        } else {
          lines = text.split("\n");
        }

        setState({ key, result: { status: "available", lines } });
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          return;
        }
        setState({ key, result: { status: "error", lines: [] } });
      }
    }

    void fetchFile();

    return () => {
      controller.abort();
    };
  }, [file.blobSha, file.commit, file.path, key, owner, repo, shouldSkip]);

  if (shouldSkip) {
    return { status: "idle", lines: file.lines };
  }

  if (!state || state.key !== key) {
    return { status: "loading", lines: [] };
  }

  return state.result;
}
