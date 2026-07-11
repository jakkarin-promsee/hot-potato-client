// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import Landing from "../Landing";
import { useLanguageStore } from "@/stores/language.store";
let container: HTMLDivElement | null = null;
let root: Root | null = null;

function renderLanding() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(
      <MemoryRouter>
        <Landing />
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

describe("Landing (landing + guide hub merged)", () => {
  it("renders the hero and the explore CTA", () => {
    const el = renderLanding();
    expect(el.textContent).toContain("เรียนรู้อย่าง");
    expect(el.textContent).toContain("เริ่มสำรวจเลย");

    const hrefs = [...el.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/explore");
  });

  it("renders both role cards and the explore shortcut (the former hub)", () => {
    const el = renderLanding();
    expect(el.textContent).toContain("ฉันเป็นนักเรียน");
    expect(el.textContent).toContain("ฉันเป็นครู");

    const hrefs = [...el.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/guide/learning");
    expect(hrefs).toContain("/guide/creating");
    expect(hrefs).toContain("/explore");
    expect(hrefs).toContain("/status");
  });

  it("is bilingual via the language store", () => {
    act(() => {
      useLanguageStore.getState().setLanguage("en");
    });
    const el = renderLanding();
    expect(el.textContent).toContain("I'm a student");
    expect(el.textContent).toContain("I'm a teacher");
    expect(el.textContent).toContain("Start exploring");
  });
});
