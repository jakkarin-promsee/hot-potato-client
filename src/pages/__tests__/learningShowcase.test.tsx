// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import LearningShowcase from "../guide/LearningShowcase";
import { LEARNING_SCENES } from "../guide/learningScenes";
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
        <LearningShowcase />
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

describe("learning showcase", () => {
  it("pins the 9-scene walkthrough with unique sequential anchors", () => {
    expect(LEARNING_SCENES).toHaveLength(9);
    expect(LEARNING_SCENES.map((s) => s.id)).toEqual(
      LEARNING_SCENES.map((_, i) => `scene-${i + 1}`),
    );
  });

  it("renders every scene section and TOC chip", () => {
    const el = renderPage();
    const sections = el.querySelectorAll("section[id^='scene-']");
    expect(sections).toHaveLength(LEARNING_SCENES.length);
    const tocChips = el.querySelectorAll("nav a[href^='#scene-']");
    expect(tocChips).toHaveLength(LEARNING_SCENES.length);
    expect(el.textContent).toContain("เริ่มได้เลย ไม่ต้องสมัคร");
  });

  it("serves every screenshot lazily from /guide/ (bundle budget guard)", () => {
    const el = renderPage();
    const images = [...el.querySelectorAll("img")];
    expect(images.length).toBeGreaterThanOrEqual(
      LEARNING_SCENES.reduce((n, s) => n + s.images.length, 0),
    );
    for (const img of images) {
      expect(img.getAttribute("src")).toMatch(/^\/guide\//);
      expect(img.getAttribute("loading")).toBe("lazy");
    }
  });

  it("deep-link CTAs point at real app routes", () => {
    const el = renderPage();
    const hrefs = [...el.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    for (const target of ["/explore", "/settings", "/login", "/guide/creating", "/guide"]) {
      expect(hrefs).toContain(target);
    }
  });
});
