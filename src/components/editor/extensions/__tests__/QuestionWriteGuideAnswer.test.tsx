// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { NodeViewProps } from "@tiptap/react";

const { mockCallCreator } = vi.hoisted(() => ({
  mockCallCreator: vi.fn(),
}));

vi.mock("@/lib/creatorApi", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/creatorApi")>();
  return { ...original, callCreator: mockCallCreator };
});

vi.mock("@tiptap/react", () => ({
  NodeViewWrapper: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/stores/language.store", () => ({
  useLanguageStore: (selector: (s: { language: "en" | "th" }) => unknown) =>
    selector({ language: "en" }),
}));

vi.mock("@/stores/canvas.store", () => ({
  useCanvasStore: (selector: (s: { contentId: string | null }) => unknown) =>
    selector({ contentId: "content-1" }),
}));

vi.mock("@/stores/content-answer.store", () => ({
  useAnswerStore: (
    selector: (s: { answers: Record<string, unknown>; setAnswer: () => void }) => unknown,
  ) => selector({ answers: {}, setAnswer: () => {} }),
}));

import QuestionWriteView from "../QuestionWriteView";

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

beforeEach(() => {
  mockCallCreator.mockReset();
});

function renderView(attrs: {
  question?: string;
  answer?: string;
}): { el: HTMLDivElement; updateAttributes: ReturnType<typeof vi.fn> } {
  const updateAttributes = vi.fn();
  const props = {
    node: {
      attrs: {
        id: "block-1",
        question: attrs.question ?? "",
        answer: attrs.answer ?? "",
        feedbackMode: "quick_check",
      },
    },
    selected: false,
    getPos: () => 0,
    updateAttributes,
    // nodeAt: () => null makes BlockMoveControls render nothing
    editor: { isEditable: true, state: { doc: { nodeAt: () => null } } },
  } as unknown as NodeViewProps;
  const el = render(<QuestionWriteView {...props} />);
  return { el, updateAttributes };
}

function findButton(el: HTMLElement, text: string): HTMLButtonElement {
  const btn = [...el.querySelectorAll("button")].find((b) =>
    (b.textContent ?? "").includes(text),
  );
  if (!btn) throw new Error(`button "${text}" not found`);
  return btn as HTMLButtonElement;
}

describe("QuestionWrite AI guide-answer fill", () => {
  it("shows the draft button only when the answer is empty", () => {
    const empty = renderView({ question: "ทำไมท้องฟ้าเป็นสีฟ้า?", answer: "" });
    expect(empty.el.textContent).toContain("Let AI draft a guide answer");

    act(() => root?.unmount());
    container?.remove();

    const filled = renderView({
      question: "ทำไมท้องฟ้าเป็นสีฟ้า?",
      answer: "มีแนวเฉลยแล้ว",
    });
    expect(filled.el.textContent).not.toContain("Let AI draft a guide answer");
  });

  it("draft → preview → accept writes the answer attr (never auto-applies)", async () => {
    mockCallCreator.mockResolvedValueOnce({
      guideAnswer: "แสงสีฟ้ากระเจิงมากกว่า",
    });
    const { el, updateAttributes } = renderView({
      question: "ทำไมท้องฟ้าเป็นสีฟ้า?",
      answer: "",
    });

    await act(async () => {
      findButton(el, "Let AI draft a guide answer").click();
    });

    expect(mockCallCreator).toHaveBeenCalledWith("content-1", "guide_answer", {
      question: "ทำไมท้องฟ้าเป็นสีฟ้า?",
    });
    // Draft previewed, not applied yet
    expect(el.textContent).toContain("แสงสีฟ้ากระเจิงมากกว่า");
    expect(updateAttributes).not.toHaveBeenCalled();

    await act(async () => {
      findButton(el, "Use this").click();
    });
    expect(updateAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ answer: "แสงสีฟ้ากระเจิงมากกว่า" }),
    );
  });

  it("discarding the draft leaves attrs untouched", async () => {
    mockCallCreator.mockResolvedValueOnce({ guideAnswer: "ร่างที่ไม่เอา" });
    const { el, updateAttributes } = renderView({
      question: "คำถาม?",
      answer: "",
    });

    await act(async () => {
      findButton(el, "Let AI draft a guide answer").click();
    });
    await act(async () => {
      findButton(el, "Discard").click();
    });

    expect(updateAttributes).not.toHaveBeenCalled();
    expect(el.textContent).not.toContain("ร่างที่ไม่เอา");
  });
});
