import { describe, expect, test } from "bun:test";
import { mapJobState } from "./job-state";

describe("mapJobState", () => {
  test("shows a queued fingerprint check as checking", () => {
    expect(mapJobState("queued", "fingerprint_check")).toBe("checking");
  });
});
