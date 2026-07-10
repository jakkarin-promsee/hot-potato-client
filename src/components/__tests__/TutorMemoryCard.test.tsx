// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { TutorMemoryCard } from "../TutorMemoryCard";

const { mockFetchMemory, mockClearMemory, memoryState } = vi.hoisted(() => ({
  mockFetchMemory: vi.fn(),
  mockClearMemory: vi.fn(),
  memoryState: {
    memory: null as {
      interests: string[];
      strengths: string[];
      growth_areas: string[];
      preferences: string[];
      recent_topics: unknown[];
    } | null,
    isLoading: false,
    isClearing: false,
    error: null as "load_failed" | "clear_failed" | null,
    fetchMemory: vi.fn(),
    clearMemory: vi.fn(),
  },
}));

memoryState.fetchMemory = mockFetchMemory;
memoryState.clearMemory = mockClearMemory;

vi.mock("@/stores/tutorMemory.store", () => ({
  isMemoryEmpty: (m: {
    interests: string[];
    strengths: string[];
    growth_areas: string[];
    preferences: string[];
    recent_topics: unknown[];
  }) =>
    m.interests.length === 0 &&
    m.strengths.length === 0 &&
    m.growth_areas.length === 0 &&
    m.preferences.length === 0 &&
    m.recent_topics.length === 0,
  useTutorMemoryStore: (selector?: (s: typeof memoryState) => unknown) =>
    selector ? selector(memoryState) : memoryState,
}));

let language: "en" | "th" = "en";

vi.mock("@/stores/language.store", () => ({
  useLanguageStore: (selector: (s: { language: "en" | "th" }) => unknown) =>
    selector({ language }),
}));

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function renderCard() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(<TutorMemoryCard />);
  });
  return container!;
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  container = null;
  root = null;
  document.body.innerHTML = "";
});

beforeEach(() => {
  language = "en";
  memoryState.memory = null;
  memoryState.isLoading = false;
  memoryState.isClearing = false;
  memoryState.error = null;
  mockFetchMemory.mockReset();
  mockClearMemory.mockResolvedValue(undefined);
});

describe("TutorMemoryCard", () => {
  it("fetches on mount", () => {
    renderCard();
    expect(mockFetchMemory).toHaveBeenCalledTimes(1);
  });

  it("shows empty state in Thai with no Forget button", () => {
    language = "th";
    memoryState.memory = {
      interests: [],
      strengths: [],
      growth_areas: [],
      preferences: [],
      recent_topics: [],
    };
    const el = renderCard();
    expect(el.textContent).toContain("คุยกับติวเตอร์ไปก่อน เดี๋ยวเขาจะจำเธอได้เอง 🥔");
    expect(el.textContent).not.toContain("ลบความจำ");
  });

  it("renders loaded chips and Forget button", () => {
    memoryState.memory = {
      interests: ["science"],
      strengths: ["curiosity"],
      growth_areas: ["algebra"],
      preferences: ["short answers"],
      recent_topics: [
        {
          content_id: "c1",
          summary: "Photosynthesis",
          updatedAt: "2026-01-01",
        },
      ],
    };
    const el = renderCard();
    const text = el.textContent ?? "";
    expect(text).toContain("science");
    expect(text).toContain("curiosity");
    expect(text).toContain("algebra");
    expect(text).toContain("short answers");
    expect(text).toContain("Photosynthesis");
    expect(text).toContain("Growing in");
    expect(text).toContain("Forget");
  });

  it("delete flow opens confirm and calls clearMemory", async () => {
    memoryState.memory = {
      interests: ["science"],
      strengths: [],
      growth_areas: [],
      preferences: [],
      recent_topics: [],
    };
    renderCard();

    const forgetBtn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Forget"),
    );
    await act(async () => {
      forgetBtn?.click();
    });

    const bodyText = document.body.textContent ?? "";
    expect(bodyText).toMatch(/Clear tutor memory\?|ลบความจำของติวเตอร์\?/);

    const clearBtn = Array.from(document.body.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Clear memory"),
    );
    await act(async () => {
      clearBtn?.click();
    });

    expect(mockClearMemory).toHaveBeenCalledTimes(1);
  });

  it("shows load_failed with Retry button", async () => {
    memoryState.error = "load_failed";
    const el = renderCard();
    expect(el.textContent).toContain("Couldn't load tutor memory.");

    const retryBtn = Array.from(el.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Retry"),
    );
    await act(async () => {
      retryBtn?.click();
    });
    expect(mockFetchMemory).toHaveBeenCalledTimes(2);
  });

  it("shows clear_failed inline error", () => {
    memoryState.memory = {
      interests: ["science"],
      strengths: [],
      growth_areas: [],
      preferences: [],
      recent_topics: [],
    };
    memoryState.error = "clear_failed";
    const el = renderCard();
    expect(el.textContent).toContain("Couldn't clear memory. Try again.");
  });
});
