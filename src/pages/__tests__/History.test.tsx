// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import History from "../History";

let language: "en" | "th" = "en";

const sampleEntries = [
  {
    _id: "hist-1",
    last_accessed: new Date("2026-07-10T11:53:00").toISOString(),
    content: {
      _id: "lesson-1",
      title: "Motion and Force",
      title_image: "",
      topics: ["Physics"],
      author_name: "Night",
      collaborator_names: [],
    },
  },
];

vi.mock("@/stores/language.store", () => ({
  useLanguageStore: (selector: (s: { language: "en" | "th" }) => unknown) =>
    selector({ language }),
}));

vi.mock("@/stores/learningHistory.store", () => ({
  useLearningHistoryStore: () => ({
    entries: sampleEntries,
    isLoading: false,
    error: null,
    fetchHistory: vi.fn(),
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

beforeEach(() => {
  vi.setSystemTime(new Date("2026-07-10T12:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
  language = "en";
  container?.remove();
  container = null;
  root = null;
});

describe("History page", () => {
  it("renders English copy by default", () => {
    const el = render(
      <MemoryRouter>
        <History />
      </MemoryRouter>,
    );

    expect(el.textContent).toContain("History");
    expect(el.textContent).toContain("Your learning journey, sorted by time");
    expect(el.textContent).toContain("Today");
    expect(el.textContent).toContain("7m ago");
  });

  it("renders Thai copy when language is Thai", () => {
    language = "th";
    const el = render(
      <MemoryRouter>
        <History />
      </MemoryRouter>,
    );

    expect(el.textContent).toContain("ประวัติ");
    expect(el.textContent).toContain("เส้นทางการเรียนของคุณ เรียงตามเวลา");
    expect(el.textContent).toContain("วันนี้");
    expect(el.textContent).toContain("7 นาทีที่แล้ว");
  });
});
