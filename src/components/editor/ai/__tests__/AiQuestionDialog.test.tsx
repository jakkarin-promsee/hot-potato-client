// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { Editor } from "@tiptap/react";

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

vi.mock("@/stores/canvas.store", () => ({
  useCanvasStore: (selector: (s: { contentId: string | null }) => unknown) =>
    selector({ contentId: "content-1" }),
}));

import AiQuestionDialog from "../AiQuestionDialog";

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

function fakeEditor() {
  const chain = {
    focus: vi.fn().mockReturnThis(),
    insertContentAt: vi.fn().mockReturnThis(),
    run: vi.fn(),
  };
  const editor = {
    isFocused: false,
    state: {
      doc: { content: { size: 20 } },
      selection: { $to: { after: () => 5 } },
    },
    chain: () => chain,
  } as unknown as Editor;
  return { editor, chain };
}

function findButton(el: HTMLElement, text: string): HTMLButtonElement {
  const btn = [...el.querySelectorAll("button")].find((b) =>
    (b.textContent ?? "").includes(text),
  );
  if (!btn) throw new Error(`button "${text}" not found`);
  return btn as HTMLButtonElement;
}

const GENERATED = {
  questions: [
    {
      type: "write" as const,
      question: "อธิบายการสังเคราะห์แสง",
      guideAnswer: "พืชใช้แสงสร้างอาหาร",
    },
    {
      type: "choice" as const,
      question: "ข้อไหนคือวัตถุดิบ?",
      choices: [
        { text: "น้ำ", correct: true },
        { text: "เสียง", correct: false },
        { text: "ลม", correct: false },
      ],
    },
  ],
};

describe("AiQuestionDialog", () => {
  it("generates with the selected controls and renders preview cards", async () => {
    mockCallCreator.mockResolvedValueOnce(GENERATED);
    const { editor, chain } = fakeEditor();
    const el = render(<AiQuestionDialog editor={editor} onClose={() => {}} />);

    await act(async () => {
      findButton(el, "Generate").click();
    });

    expect(mockCallCreator).toHaveBeenCalledWith(
      "content-1",
      "generate_questions",
      {
        scope: "lesson",
        selectionMarkdown: undefined,
        types: ["choice", "write"],
        count: 3,
        difficulty: "mixed",
      },
    );
    // Preview cards render, nothing inserted yet (T2: preview → accept)
    expect(el.textContent).toContain("อธิบายการสังเคราะห์แสง");
    expect(el.textContent).toContain("ข้อไหนคือวัตถุดิบ?");
    expect(chain.insertContentAt).not.toHaveBeenCalled();
  });

  it("accepting one card inserts exactly that block with mapped attrs", async () => {
    mockCallCreator.mockResolvedValueOnce(GENERATED);
    const { editor, chain } = fakeEditor();
    const el = render(<AiQuestionDialog editor={editor} onClose={() => {}} />);

    await act(async () => {
      findButton(el, "Generate").click();
    });
    await act(async () => {
      findButton(el, "Add to lesson").click(); // first card = the write question
    });

    expect(chain.insertContentAt).toHaveBeenCalledTimes(1);
    const [, content] = chain.insertContentAt.mock.calls[0];
    expect(content).toHaveLength(2); // block + trailing paragraph
    expect(content[0].type).toBe("QuestionWrite");
    expect(content[0].attrs.question).toBe("อธิบายการสังเคราะห์แสง");
    expect(content[0].attrs.answer).toBe("พืชใช้แสงสร้างอาหาร"); // guideAnswer → answer
    expect(content[0].attrs.feedbackMode).toBe("quick_check");
    expect(el.textContent).toContain("Added");
  });

  it("Add all inserts only pending cards; discarded ones never insert", async () => {
    mockCallCreator.mockResolvedValueOnce(GENERATED);
    const { editor, chain } = fakeEditor();
    const el = render(<AiQuestionDialog editor={editor} onClose={() => {}} />);

    await act(async () => {
      findButton(el, "Generate").click();
    });
    await act(async () => {
      findButton(el, "Discard").click(); // discard the first (write) card
    });
    await act(async () => {
      findButton(el, "Add all").click();
    });

    expect(chain.insertContentAt).toHaveBeenCalledTimes(1);
    const [, content] = chain.insertContentAt.mock.calls[0];
    expect(content).toHaveLength(2);
    expect(content[0].type).toBe("QuestionChoice");
    expect(content[0].attrs.answerType).toBe("single");
  });

  it("shows a friendly error and no cards when the AI call fails", async () => {
    mockCallCreator.mockRejectedValueOnce(new Error("boom"));
    const { editor, chain } = fakeEditor();
    const el = render(<AiQuestionDialog editor={editor} onClose={() => {}} />);

    await act(async () => {
      findButton(el, "Generate").click();
    });

    expect(el.textContent).toContain("AI is busy");
    expect(chain.insertContentAt).not.toHaveBeenCalled();
  });
});
