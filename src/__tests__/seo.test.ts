import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Resolve files relative to this test file so the suite works regardless of cwd.
const p = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const read = (rel: string) => readFileSync(p(rel), "utf-8");

const html = read("../../index.html");

describe("index.html SEO / link-preview tags (Tier 0.A)", () => {
  it("declares Thai as the document language", () => {
    expect(html).toContain('<html lang="th">');
  });

  it("has a non-empty meta description", () => {
    const m = html.match(/<meta name="description"\s+content="([^"]+)"/);
    expect(m?.[1]?.trim().length ?? 0).toBeGreaterThan(20);
  });

  it("has the core Open Graph tags", () => {
    expect(html).toContain('property="og:type" content="website"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toMatch(/property="og:image" content="[^"]*og-image\.png"/);
  });

  it("has a twitter card", () => {
    expect(html).toMatch(/name="twitter:card" content="summary(_large_image)?"/);
  });

  it("declares the favicon as PNG served from public/", () => {
    expect(html).toContain('<link rel="icon" type="image/png" href="/favicon.png"');
    expect(html).not.toContain('image/svg+xml');
  });

  it("loads the real entry module (main.tsx, not main.jsx)", () => {
    expect(html).toContain('src="/src/main.tsx"');
    expect(html).not.toContain("main.jsx");
  });
});

describe("public/ static SEO files (Tier 0.A)", () => {
  it("robots.txt exists and allows all crawlers", () => {
    const robots = read("../../public/robots.txt");
    expect(robots).toMatch(/User-agent: \*/);
    expect(robots).toMatch(/Allow: \//);
  });

  it("og-image.png and favicon.png exist in public/", () => {
    expect(existsSync(p("../../public/og-image.png"))).toBe(true);
    expect(existsSync(p("../../public/favicon.png"))).toBe(true);
  });
});
