// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";

const { mockCallCreator } = vi.hoisted(() => ({
  mockCallCreator: vi.fn(),
}));

vi.mock("@/lib/creatorApi", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/creatorApi")>();
  return { ...original, callCreator: mockCallCreator };
});

vi.mock("@/stores/language.store", () => ({
  useLanguageStore: (selector: (s: { language: "en" | "th" }) => unknown) =>
    selector({ language: "en" }),
}));

// Real canvas store — the test asserts actual store fields get filled.
import { useCanvasStore } from "@/stores/canvas.store";
import PublishSettingsModal from "../PublishSettingsModal";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function render(ui: React.ReactElement): HTMLDivElement {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

const DEFAULT_AGENT = {
  persona_note: "",
  allow_direct_answers: false,
  scope: "lesson_plus_general" as const,
  custom_guidelines: "",
};

// happy-dom has no window.confirm — install a mock we control per test
let confirmMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockCallCreator.mockReset();
  confirmMock = vi.fn(() => true);
  (window as unknown as { confirm: typeof confirmMock }).confirm = confirmMock;
  useCanvasStore.setState({
    contentId: "content-1",
    title: "Untitled",
    titleImage: "",
    description: "",
    topics: [],
    collaborators: [],
    accessType: "private",
    agentSettings: { ...DEFAULT_AGENT },
    isSaving: false,
    isDirty: false,
  });
});

function findButton(el: HTMLElement, text: string): HTMLButtonElement {
  const btn = [...el.querySelectorAll("button")].find((b) =>
    (b.textContent ?? "").includes(text),
  );
  if (!btn) throw new Error(`button "${text}" not found`);
  return btn as HTMLButtonElement;
}

function renderModal(): HTMLDivElement {
  return render(
    <MemoryRouter>
      <PublishSettingsModal open onClose={() => {}} />
    </MemoryRouter>,
  );
}

const META = {
  title: "การสังเคราะห์แสง",
  description: "บทเรียนว่าพืชสร้างอาหารอย่างไร",
  topics: ["ชีววิทยา", "พืช"],
};

describe("Publish autofill — lesson meta", () => {
  it("fills empty fields silently (no confirm) and does not save", async () => {
    const confirmSpy = confirmMock;
    mockCallCreator.mockResolvedValueOnce(META);
    const el = renderModal();

    await act(async () => {
      findButton(el, "AI autofill").click();
    });

    expect(mockCallCreator).toHaveBeenCalledWith("content-1", "lesson_meta", {});
    expect(confirmSpy).not.toHaveBeenCalled();
    const state = useCanvasStore.getState();
    expect(state.title).toBe("การสังเคราะห์แสง");
    expect(state.description).toBe("บทเรียนว่าพืชสร้างอาหารอย่างไร");
    expect(state.topics).toEqual(["ชีววิทยา", "พืช"]);
    expect(state.isSaving).toBe(false); // nothing auto-saved by the fill
  });

  it("asks once before overwriting non-empty fields; decline fills only empty ones", async () => {
    useCanvasStore.setState({ title: "ชื่อเดิมของครู" });
    confirmMock.mockReturnValue(false);
    const confirmSpy = confirmMock;
    mockCallCreator.mockResolvedValueOnce(META);
    const el = renderModal();

    await act(async () => {
      findButton(el, "AI autofill").click();
    });

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    const state = useCanvasStore.getState();
    expect(state.title).toBe("ชื่อเดิมของครู"); // kept
    expect(state.description).toBe(META.description); // was empty → filled
    expect(state.topics).toEqual(META.topics);
  });

  it("accepting the confirm overwrites everything", async () => {
    useCanvasStore.setState({ title: "ชื่อเดิม", description: "คำอธิบายเดิม" });
    confirmMock.mockReturnValue(true);
    mockCallCreator.mockResolvedValueOnce(META);
    const el = renderModal();

    await act(async () => {
      findButton(el, "AI autofill").click();
    });

    const state = useCanvasStore.getState();
    expect(state.title).toBe(META.title);
    expect(state.description).toBe(META.description);
  });
});

const SUGGESTION = {
  persona_note: "โค้ชใจดีสายชีววิทยา",
  custom_guidelines: "อย่าเฉลยคำถามข้อ 2 ตรงๆ",
  scope: "lesson_only" as const,
  allow_direct_answers: false,
  reason: "เนื้อหาเน้นความเข้าใจ ควรชวนคิดก่อนเฉลย",
};

describe("Publish autofill — agent settings", () => {
  it("applies the suggestion silently when settings are default, and shows the reason", async () => {
    const confirmSpy = confirmMock;
    mockCallCreator.mockResolvedValueOnce(SUGGESTION);
    const el = renderModal();

    await act(async () => {
      findButton(el, "AI suggest tutor settings").click();
    });

    expect(mockCallCreator).toHaveBeenCalledWith(
      "content-1",
      "agent_settings_suggest",
      {},
    );
    expect(confirmSpy).not.toHaveBeenCalled();
    const s = useCanvasStore.getState().agentSettings;
    expect(s.persona_note).toBe(SUGGESTION.persona_note);
    expect(s.custom_guidelines).toBe(SUGGESTION.custom_guidelines);
    expect(s.scope).toBe("lesson_only");
    expect(el.textContent).toContain(SUGGESTION.reason);
  });

  it("keeps the teacher's existing text fields when they decline the overwrite", async () => {
    useCanvasStore.setState({
      agentSettings: { ...DEFAULT_AGENT, persona_note: "โทนของครูเอง" },
    });
    confirmMock.mockReturnValue(false);
    mockCallCreator.mockResolvedValueOnce(SUGGESTION);
    const el = renderModal();

    await act(async () => {
      findButton(el, "AI suggest tutor settings").click();
    });

    const s = useCanvasStore.getState().agentSettings;
    expect(s.persona_note).toBe("โทนของครูเอง"); // kept
    expect(s.custom_guidelines).toBe(SUGGESTION.custom_guidelines); // was empty
    expect(s.scope).toBe("lesson_plus_general"); // enum untouched on decline
  });
});
