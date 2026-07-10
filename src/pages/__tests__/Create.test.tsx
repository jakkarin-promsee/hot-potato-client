// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import CreatorDashboard from "../Create";

let language: "en" | "th" = "en";

vi.mock("@/stores/language.store", () => ({
  useLanguageStore: (selector: (s: { language: "en" | "th" }) => unknown) =>
    selector({ language }),
}));

vi.mock("@/stores/content.store", () => ({
  useContentStore: () => ({
    contents: [
      {
        _id: "lesson-1",
        title: "Untitled",
        title_image: "",
        updatedAt: new Date().toISOString(),
      },
    ],
    isLoading: false,
    fetchMyContents: vi.fn(),
    searchContents: vi.fn(),
    createContent: vi.fn(),
  }),
}));

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function render(ui: React.ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return container!;
}

afterEach(() => {
  language = "en";
  container?.remove();
  container = null;
  root = null;
});

describe("Create page", () => {
  it("renders English copy by default", () => {
    const el = render(
      <MemoryRouter>
        <CreatorDashboard />
      </MemoryRouter>,
    );

    expect(el.textContent).toContain("Your Content");
    expect(el.textContent).toContain("1 lessons created");
    expect(el.textContent).toContain("New Lesson");
    expect(el.querySelector("input")?.getAttribute("placeholder")).toBe(
      "Search your lessons...",
    );
  });

  it("renders Thai copy when language is Thai", () => {
    language = "th";
    const el = render(
      <MemoryRouter>
        <CreatorDashboard />
      </MemoryRouter>,
    );

    expect(el.textContent).toContain("เนื้อหาของคุณ");
    expect(el.textContent).toContain("สร้างแล้ว 1 บทเรียน");
    expect(el.textContent).toContain("สร้างบทเรียนใหม่");
    expect(el.querySelector("input")?.getAttribute("placeholder")).toBe(
      "ค้นหาบทเรียนของคุณ...",
    );
  });
});
