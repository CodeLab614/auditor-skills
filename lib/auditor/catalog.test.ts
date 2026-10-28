import { describe, expect, test } from "bun:test";
import { escapeLike } from "./catalog";

describe("catalog", () => {
  test("escapeLike escapes percent, underscore and backslash", () => {
    expect(escapeLike("50%_a\\b")).toBe("50\\%\\_a\\\\b");
  });
});
