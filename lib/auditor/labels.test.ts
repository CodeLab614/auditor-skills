import { describe, expect, test } from "bun:test";
import { formatCount, formatDay, isInstallable } from "./labels";

describe("auditor labels", () => {
  test("only skills without serious findings are installable", () => {
    expect(isInstallable("no-serious-findings")).toBe(true);
    expect(isInstallable("review")).toBe(false);
    expect(isInstallable("dangerous")).toBe(false);
  });

  test("formatCount groups four digit numbers", () => {
    expect(formatCount(1240)).toBe("1.240");
    expect(formatCount(12)).toBe("12");
    expect(formatCount(0)).toBe("0");
    expect(formatCount(999999)).toBe("999.999");
  });

  test("formatDay drops the time", () => {
    expect(formatDay("2026-09-23T14:30:00Z")).toBe("23 sept 2026");
    expect(formatDay("2026-10-25T12:00:00Z")).toBe("25 oct 2026");
    expect(formatDay("2026-09-23")).toBe("23 sept 2026");
  });
});
