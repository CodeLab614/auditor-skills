import { describe, expect, test } from "bun:test";
import { gitBlobSha } from "./git-blob";

describe("gitBlobSha", () => {
  test("matches git for hello", async () => {
    const bytes = new TextEncoder().encode("hello\n");
    expect(await gitBlobSha(bytes)).toBe("ce013625030ba8dba906f756967f9e9ca394464a");
  });

  test("matches git for empty", async () => {
    const bytes = new Uint8Array(0);
    expect(await gitBlobSha(bytes)).toBe("e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
  });
});
