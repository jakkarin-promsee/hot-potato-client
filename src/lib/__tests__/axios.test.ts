import { describe, it, expect, vi } from "vitest";

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: { getState: () => ({ token: null }) },
}));

import {
  buildForcedLoginUrl,
  isProtectedPath,
  isSafeRedirectTarget,
} from "../axios";

describe("isProtectedPath", () => {
  it("matches protected prefixes and nested paths", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/canvas/abc123")).toBe(true);
    expect(isProtectedPath("/history")).toBe(true);
  });

  it("returns false for public paths", () => {
    expect(isProtectedPath("/explore")).toBe(false);
    expect(isProtectedPath("/view/lesson-id")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/settings")).toBe(false);
  });
});

describe("isSafeRedirectTarget", () => {
  it("accepts same-origin paths and rejects open redirects", () => {
    expect(isSafeRedirectTarget("/history")).toBe(true);
    expect(isSafeRedirectTarget("/dashboard?q=1")).toBe(true);
    expect(isSafeRedirectTarget("//evil.com")).toBe(false);
    expect(isSafeRedirectTarget("https://evil.com")).toBe(false);
  });
});

describe("buildForcedLoginUrl", () => {
  it("encodes reason, code, and redirect", () => {
    const url = buildForcedLoginUrl(
      "/dashboard",
      "?tab=mine",
      "Session expired",
      "TOKEN_EXPIRED",
    );
    expect(url).toContain("reason=Session+expired");
    expect(url).toContain("code=TOKEN_EXPIRED");
    expect(url).toContain("redirect=%2Fdashboard%3Ftab%3Dmine");
    expect(url.startsWith("/login?")).toBe(true);
  });
});
