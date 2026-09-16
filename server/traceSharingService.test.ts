import { describe, expect, it } from "vitest";
import { createTraceShareToken, hashTraceShareToken, isTraceShareLinkActive } from "./traceSharingService";

describe("Trace sharing links", () => {
  it("creates unique, unpredictable, URL-safe tokens and stores only their digest", () => {
    const first = createTraceShareToken();
    const second = createTraceShareToken();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(first.length).toBeGreaterThanOrEqual(43);
    expect(hashTraceShareToken(first)).not.toContain(first);
    expect(hashTraceShareToken(first)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("remains active until explicitly revoked", () => {
    expect(isTraceShareLinkActive(null)).toBe(true);
    expect(isTraceShareLinkActive(new Date(0))).toBe(false);
  });
});