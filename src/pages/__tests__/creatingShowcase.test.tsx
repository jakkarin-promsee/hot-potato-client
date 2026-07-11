// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import CreatingShowcase from "../guide/CreatingShowcase";
import { CREATING_SCENES } from "../guide/creatingScenes";
import { useLanguageStore } from "@/stores/language.store";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function renderPage() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(
      <MemoryRouter>
        <CreatingShowcase />
      </MemoryRouter>,
    );
  });
  return container!;
}

beforeEach(() => {
  act(() => {
    useLanguageStore.getState().setLanguage("th");
  });
});

afterEach(() => {
  container?.remove();
  container = null;
  root = null;
});

describe("creating showcase", () => {
  it("pins the 10-scene walkthrough with unique sequential anchors", () => {
    expect(CREATING_SCENES).toHaveLength(10);
    expect(CREATING_SCENES.map((s) => s.id)).toEqual(
      CREATING_SCENES.map((_, i) => `scene-${i + 1}`),
    );
  });

  it("renders every scene section and TOC chip", () => {
    const el = renderPage();
    const sections = el.querySelectorAll("section[id^='scene-']");
    expect(sections).toHaveLength(CREATING_SCENES.length);
    const tocChips = el.querySelectorAll("nav a[href^='#scene-']");
    expect(tocChips).toHaveLength(CREATING_SCENES.length);
    expect(el.textContent).toContain("เตรียมตัวก่อนสร้าง");
  });

  it("serves every screenshot lazily from /guide/ (bundle budget guard)", () => {
    const el = renderPage();
    const images = [...el.querySelectorAll("img")];
    expect(images.length).toBeGreaterThanOrEqual(
      CREATING_SCENES.reduce((n, s) => n + s.images.length, 0),
    );
    for (const img of images) {
      expect(img.getAttribute("src")).toMatch(/^\/guide\/creating-/);
      expect(img.getAttribute("loading")).toBe("lazy");
    }
  });

  it("final CTA + cross-link point at real app routes", () => {
    const el = renderPage();
    const hrefs = [...el.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    for (const target of ["/create", "/guide/learning", "/guide"]) {
      expect(hrefs).toContain(target);
    }
  });
});
