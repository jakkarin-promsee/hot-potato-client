import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("no CDN fonts", () => {
  it("index.html and index.css contain no Google Fonts CDN URLs", () => {
    const html = readFileSync(
      path.resolve(process.cwd(), "index.html"),
      "utf8",
    );
    const css = readFileSync(
      path.resolve(process.cwd(), "src/index.css"),
      "utf8",
    );

    for (const src of [html, css]) {
      expect(src).not.toContain("fonts.googleapis.com");
      expect(src).not.toContain("fonts.gstatic.com");
    }
  });
});
