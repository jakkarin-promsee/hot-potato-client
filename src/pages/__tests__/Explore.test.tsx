// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import Explore from "../Explore";

let language: "en" | "th" = "en";

vi.mock("@/stores/language.store", () => ({
  useLanguageStore: (selector: (s: { language: "en" | "th" }) => unknown) =>
    selector({ language }),
}));

vi.mock("@/stores/content.store", () => ({
  useContentStore: () => ({
    exploreContents: [],
    exploreLoading: false,
    error: null,
    fetchExploreContents: vi.fn(),
    searchExploreContents: vi.fn(),
  }),
}));

vi.mock("@/stores/learningHistory.store", () => ({
  useLearningHistoryStore: () => ({
    entries: [],
    isLoading: false,
    error: null,
    fetchHistory: vi.fn(),
  }),
}));

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: (selector: (s: { token: string | null }) => unknown) =>
    selector({ token: null }),
}));

vi.mock("@/stores/bookmark.store", () => ({
  useBookmarkStore: (
    selector: (s: {
      ids: string[];
      toggle: () => void;
      has: () => boolean;
    }) => unknown,
  ) =>
    selector({
      ids: [],
      toggle: vi.fn(),
      has: () => false,
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

describe("Explore page", () => {
  it("renders English copy by default", () => {
    const el = render(
      <MemoryRouter>
        <Explore />
      </MemoryRouter>,
    );

    expect(el.textContent).toContain("Explore");
    expect(el.textContent).toContain("Continue learning");
    expect(el.querySelector("input")?.getAttribute("placeholder")).toBe(
      "Search public lessons...",
    );
  });

  it("renders Thai copy when language is Thai", () => {
    language = "th";
    const el = render(
      <MemoryRouter>
        <Explore />
      </MemoryRouter>,
    );

    expect(el.textContent).toContain("สำรวจ");
    expect(el.textContent).toContain("เรียนต่อ");
    expect(el.querySelector("input")?.getAttribute("placeholder")).toBe(
      "ค้นหาบทเรียนสาธารณะ...",
    );
  });
});
