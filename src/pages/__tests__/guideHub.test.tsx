// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import Guide from "../Guide";
import { useLanguageStore } from "@/stores/language.store";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function renderHub() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(
      <MemoryRouter>
        <Guide />
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

describe("Guide hub", () => {
  it("renders both role cards and the explore shortcut", () => {
    const el = renderHub();
    expect(el.textContent).toContain("ฉันเป็นนักเรียน");
    expect(el.textContent).toContain("ฉันเป็นครู");
    expect(el.textContent).toContain("คู่มือการใช้งาน");

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
    const el = renderHub();
    expect(el.textContent).toContain("I'm a student");
    expect(el.textContent).toContain("I'm a teacher");
  });
});
