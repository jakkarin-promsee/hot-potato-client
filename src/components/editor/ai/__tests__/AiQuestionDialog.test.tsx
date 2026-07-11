// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { Editor } from "@tiptap/react";
import { Editor as TiptapEditor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";

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
import { useCreatorGradeLevelStore } from "@/stores/creatorGradeLevel.store";

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
  localStorage.clear();
  useCreatorGradeLevelStore.setState({ gradeLevel: "" });
});

function fakeEditor(insertPos = 12) {
  const chain = {
    focus: vi.fn().mockReturnThis(),
    insertContentAt: vi.fn().mockReturnThis(),
    run: vi.fn(),
  };
  const editor = {
    isFocused: false,
    state: {
      doc: {
        content: { size: 20 },
        forEach: () => {},
        descendants: () => {},
        textBetween: vi.fn(() => ""),
      },
      selection: {
        $to: { after: () => insertPos },
        $from: { after: () => insertPos },
      },
    },
    chain: () => chain,
  } as unknown as Editor;
  return { editor, chain, insertPos };
}

function findButton(el: HTMLElement, text: string): HTMLButtonElement {
  const btn = [...el.querySelectorAll("button")].find((b) =>
    (b.textContent ?? "").includes(text),
  );
  if (!btn) throw new Error(`button "${text}" not found`);
  return btn as HTMLButtonElement;
}

function findCloseButton(el: HTMLElement): HTMLButtonElement {
  const btn = el.querySelector('button[aria-label="Close"]');
  if (!btn) throw new Error('close button not found');
  return btn as HTMLButtonElement;
}

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!;
    setter.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
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
    const { editor, chain } = fakeEditor(12);
    const el = render(<AiQuestionDialog editor={editor} onClose={() => {}} />);

    await act(async () => {
      findButton(el, "Generate").click();
    });
    await act(async () => {
      findButton(el, "Add to lesson").click(); // first card = the write question
    });

    expect(chain.insertContentAt).toHaveBeenCalledTimes(1);
    const [pos, content] = chain.insertContentAt.mock.calls[0];
    expect(pos).toBe(12);
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

  it("shows the cursor-placement note on the form", () => {
    const { editor } = fakeEditor();
    const el = render(<AiQuestionDialog editor={editor} onClose={() => {}} />);
    expect(el.textContent).toContain("cursor was when you opened");
  });

  it("sends scope=selection when only some sections are checked", async () => {
    mockCallCreator.mockResolvedValueOnce(GENERATED);
    const ed = new TiptapEditor({
      extensions: [StarterKit, Markdown],
      content: "<h2>บทนำ</h2><p>เนื้อหาแรก</p><h2>สรุป</h2><p>เนื้อหาสอง</p>",
    });
    const el = render(
      <AiQuestionDialog editor={ed as unknown as Editor} onClose={() => {}} />,
    );

    const boxes = [...el.querySelectorAll('input[type="checkbox"]')] as HTMLInputElement[];
    // Uncheck "Select all" → clears every section
    act(() => {
      boxes[0].click();
    });
    // Re-check only the first section (index 1 in the list)
    act(() => {
      boxes[1].click();
    });

    await act(async () => {
      findButton(el, "Generate").click();
    });

    expect(mockCallCreator).toHaveBeenCalledWith(
      "content-1",
      "generate_questions",
      expect.objectContaining({
        scope: "selection",
        selectionMarkdown: expect.stringContaining("บทนำ"),
      }),
    );
    ed.destroy();
  });

  it("closes immediately when nothing has been changed", () => {
    const onClose = vi.fn();
    const { editor } = fakeEditor();
    const el = render(
      <AiQuestionDialog editor={editor} onClose={onClose} />,
    );
    act(() => {
      findCloseButton(el).click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("asks for confirmation before closing when there are pending questions", async () => {
    const onClose = vi.fn();
    mockCallCreator.mockResolvedValueOnce(GENERATED);
    const { editor } = fakeEditor();
    const el = render(
      <AiQuestionDialog editor={editor} onClose={onClose} />,
    );

    await act(async () => {
      findButton(el, "Generate").click();
    });
    act(() => {
      findCloseButton(el).click();
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Leave this dialog?");

    act(() => {
      findButton(document.body as HTMLElement, "Stay").click();
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      findCloseButton(el).click();
    });
    act(() => {
      findButton(document.body as HTMLElement, "Leave").click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("asks for confirmation when the style hint has text", () => {
    const onClose = vi.fn();
    const { editor } = fakeEditor();
    const el = render(
      <AiQuestionDialog editor={editor} onClose={onClose} />,
    );
    setTextareaValue(
      el.querySelector("textarea") as HTMLTextAreaElement,
      "เน้นตัวอย่างจริง",
    );
    act(() => {
      findCloseButton(el).click();
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Leave this dialog?");
  });
});
