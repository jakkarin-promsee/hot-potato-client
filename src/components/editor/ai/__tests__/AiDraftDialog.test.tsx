// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import type { Editor as ReactEditor } from "@tiptap/react";

const { mockCallCreator, mockInsertQuestions } = vi.hoisted(() => ({
  mockCallCreator: vi.fn(),
  mockInsertQuestions: vi.fn(),
}));

vi.mock("@/lib/creatorApi", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/creatorApi")>();
  return { ...original, callCreator: mockCallCreator };
});

// The minimal headless schema (StarterKit only) has no question nodes, so the
// question-insert path is asserted via this mock; its real mapping/insert
// behavior is covered by questionInsert.test.ts.
vi.mock("../questionInsert", async (importOriginal) => {
  const original = await importOriginal<typeof import("../questionInsert")>();
  return { ...original, insertGeneratedQuestions: mockInsertQuestions };
});

vi.mock("@/stores/language.store", () => ({
  useLanguageStore: (selector: (s: { language: "en" | "th" }) => unknown) =>
    selector({ language: "en" }),
}));

vi.mock("@/stores/canvas.store", () => ({
  useCanvasStore: (selector: (s: { contentId: string | null }) => unknown) =>
    selector({ contentId: "content-1" }),
}));

import AiDraftDialog from "../AiDraftDialog";
import AiDraftLauncher from "../AiDraftLauncher";
import { listHeadings } from "../draftHelpers";

let container: HTMLDivElement | null = null;
let root: Root | null = null;
let editor: Editor | null = null;

function render(ui: React.ReactElement): HTMLDivElement {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return container;
}

/** AiDraftDialog portals to document.body — query the live modal, not the mount node. */
function dialogEl(): HTMLElement {
  const modal = document.querySelector("[data-editor-modal]");
  if (!modal) throw new Error("AiDraftDialog portal not mounted");
  return modal as HTMLElement;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
  editor?.destroy();
  editor = null;
});

beforeEach(() => {
  mockCallCreator.mockReset();
  mockInsertQuestions.mockReset();
});

function makeEditor(content: string): Editor {
  editor = new Editor({ extensions: [StarterKit, Markdown], content });
  return editor;
}

function findButton(el: HTMLElement, text: string): HTMLButtonElement {
  const btn = [...el.querySelectorAll("button")].find((b) =>
    (b.textContent ?? "").includes(text),
  );
  if (!btn) throw new Error(`button "${text}" not found`);
  return btn as HTMLButtonElement;
}

function setInputValue(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  act(() => {
    const proto =
      input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function setSelectValue(select: HTMLSelectElement, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      "value",
    )!.set!;
    setter.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("AiDraftDialog — outline tab", () => {
  it("requires topic and grade level before drafting", async () => {
    const ed = makeEditor("");
    render(
      <AiDraftDialog editor={ed as unknown as ReactEditor} onClose={() => {}} />,
    );
    const dialog = dialogEl();
    const draftBtn = findButton(dialog, "Draft outline");

    expect(draftBtn.disabled).toBe(true);

    setInputValue(
      dialog.querySelector("input") as HTMLInputElement,
      "แรงและการเคลื่อนที่",
    );
    expect(draftBtn.disabled).toBe(true);

    setSelectValue(
      dialog.querySelector("select") as HTMLSelectElement,
      "ม.1",
    );
    expect(draftBtn.disabled).toBe(false);
  });

  it("drafts an outline and inserts it on accept only (empty doc → top)", async () => {
    mockCallCreator.mockResolvedValueOnce({
      outlineMarkdown: "## บทนำ\n\n## แรงและการเคลื่อนที่",
    });
    const ed = makeEditor("");
    render(
      <AiDraftDialog editor={ed as unknown as ReactEditor} onClose={() => {}} />,
    );
    const dialog = dialogEl();

    setInputValue(
      dialog.querySelector("input") as HTMLInputElement,
      "แรงและการเคลื่อนที่",
    );
    setSelectValue(
      dialog.querySelector("select") as HTMLSelectElement,
      "ป.4",
    );
    setInputValue(
      dialog.querySelector("textarea") as HTMLTextAreaElement,
      "เน้นตัวอย่างในชีวิตประจำวัน",
    );
    await act(async () => {
      findButton(dialog, "Draft outline").click();
    });

    expect(mockCallCreator).toHaveBeenCalledWith("content-1", "outline", {
      topic: "แรงและการเคลื่อนที่",
      gradeLevel: "ป.4",
      objectives: undefined,
      styleHint: "เน้นตัวอย่างในชีวิตประจำวัน",
    });
    // Preview shown, doc still empty (T2)
    expect(ed.state.doc.textContent).toBe("");

    act(() => {
      findButton(dialog, "Insert into lesson").click();
    });
    const headings = listHeadings(ed as unknown as ReactEditor);
    expect(headings.map((h) => h.text)).toEqual([
      "บทนำ",
      "แรงและการเคลื่อนที่",
    ]);
    expect(dialog.textContent).toContain("Inserted ✓");
  });

  it("inserts the outline at the teacher's cursor, not at the doc top (3.5.G)", async () => {
    mockCallCreator.mockResolvedValueOnce({ outlineMarkdown: "## โครงใหม่" });
    const ed = makeEditor("<p>ย่อหน้าแรก</p><p>ย่อหน้าสอง</p>");
    // Caret inside the first paragraph — outline should land right after it.
    ed.commands.setTextSelection(3);
    render(
      <AiDraftDialog editor={ed as unknown as ReactEditor} onClose={() => {}} />,
    );
    const dialog = dialogEl();

    setInputValue(dialog.querySelector("input") as HTMLInputElement, "หัวข้อ");
    setSelectValue(
      dialog.querySelector("select") as HTMLSelectElement,
      "ม.2",
    );
    await act(async () => {
      findButton(dialog, "Draft outline").click();
    });
    act(() => {
      findButton(dialog, "Insert into lesson").click();
    });

    const text = ed.state.doc
      .textBetween(0, ed.state.doc.content.size, "\n")
      .replace(/\n+$/, "");
    expect(text).toBe("ย่อหน้าแรก\nโครงใหม่\nย่อหน้าสอง");
  });
});

describe("AiDraftDialog — fill tab", () => {
  it("lists doc headings, drafts a section, and inserts below the heading", async () => {
    mockCallCreator.mockResolvedValueOnce({ markdown: "เนื้อหาบทนำจาก AI" });
    const ed = makeEditor("<h2>บทนำ</h2><h2>สรุป</h2>");
    render(
      <AiDraftDialog
        editor={ed as unknown as ReactEditor}
        onClose={() => {}}
        initialTab="fill"
      />,
    );
    const dialog = dialogEl();

    const select = dialog.querySelector("select") as HTMLSelectElement;
    expect(select.options.length).toBe(2);
    expect(select.options[0].textContent).toContain("บทนำ");

    await act(async () => {
      findButton(dialog, "Write this section").click();
    });
    expect(mockCallCreator).toHaveBeenCalledWith("content-1", "draft_section", {
      heading: "บทนำ",
      outlineMarkdown: "## บทนำ\n## สรุป",
    });

    act(() => {
      findButton(dialog, "Insert below heading").click();
    });
    const text = ed.state.doc
      .textBetween(0, ed.state.doc.content.size, "\n")
      .replace(/\n+$/, "");
    expect(text).toBe("บทนำ\nเนื้อหาบทนำจาก AI\nสรุป");
  });

  it("sends the teacher's detail as styleHint and offers suggested questions (3.5.G)", async () => {
    mockCallCreator.mockResolvedValueOnce({ markdown: "เนื้อหาที่มีการทดลอง" });
    const ed = makeEditor("<h2>บทนำ</h2>");
    render(
      <AiDraftDialog
        editor={ed as unknown as ReactEditor}
        onClose={() => {}}
        initialTab="fill"
      />,
    );
    const dialog = dialogEl();

    setInputValue(
      dialog.querySelector("textarea") as HTMLTextAreaElement,
      "เน้นการทดลองสั้น ๆ",
    );
    await act(async () => {
      findButton(dialog, "Write this section").click();
    });
    expect(mockCallCreator).toHaveBeenCalledWith("content-1", "draft_section", {
      heading: "บทนำ",
      outlineMarkdown: "## บทนำ",
      styleHint: "เน้นการทดลองสั้น ๆ",
    });

    // The questions flow: generate from the fresh section text, preview-first
    mockCallCreator.mockResolvedValueOnce({
      questions: [
        { type: "write", question: "ทำไมผลการทดลองเป็นแบบนี้", guideAnswer: "แนวเฉลย" },
      ],
    });
    await act(async () => {
      findButton(dialog, "Suggest questions from this section").click();
    });
    expect(mockCallCreator).toHaveBeenLastCalledWith(
      "content-1",
      "generate_questions",
      {
        scope: "selection",
        selectionMarkdown: "## บทนำ\n\nเนื้อหาที่มีการทดลอง",
        types: ["choice", "write"],
        count: 3,
        difficulty: "mixed",
      },
    );
    expect(dialog.textContent).toContain("ทำไมผลการทดลองเป็นแบบนี้");
    expect(mockInsertQuestions).not.toHaveBeenCalled();

    act(() => {
      findButton(dialog, "Add to lesson").click();
    });
    expect(mockInsertQuestions).toHaveBeenCalledTimes(1);
  });

  it("shows the empty-state hint when the doc has no headings", () => {
    const ed = makeEditor("<p>มีแต่ข้อความ</p>");
    render(
      <AiDraftDialog
        editor={ed as unknown as ReactEditor}
        onClose={() => {}}
        initialTab="fill"
      />,
    );
    expect(dialogEl().textContent).toContain("No headings yet");
  });
});

describe("AiDraftDialog — import tab", () => {
  it("caps the textarea, imports, and inserts markdown + accepted questions", async () => {
    mockCallCreator.mockResolvedValueOnce({
      markdown: "## จากชีทเดิม\n\nเนื้อหาที่จัดแล้ว",
      suggestedQuestions: [
        {
          type: "write",
          question: "สรุปใจความหลัก",
          guideAnswer: "แนวเฉลยนำเข้า",
        },
      ],
    });
    const ed = makeEditor("");
    render(
      <AiDraftDialog
        editor={ed as unknown as ReactEditor}
        onClose={() => {}}
        initialTab="import"
      />,
    );
    const dialog = dialogEl();

    setInputValue(
      dialog.querySelector("textarea") as HTMLTextAreaElement,
      "เนื้อหาชีทเก่าของครู",
    );
    await act(async () => {
      findButton(dialog, "Restructure into a lesson").click();
    });
    expect(mockCallCreator).toHaveBeenCalledWith(
      "content-1",
      "import_structure",
      { rawText: "เนื้อหาชีทเก่าของครู" },
    );
    // Nothing inserted until accepted
    expect(ed.state.doc.textContent).toBe("");

    act(() => {
      findButton(dialog, "Insert the content").click();
    });
    expect(ed.state.doc.textContent).toContain("เนื้อหาที่จัดแล้ว");

    act(() => {
      findButton(dialog, "Add to lesson").click();
    });
    expect(mockInsertQuestions).toHaveBeenCalledTimes(1);
    const [, accepted] = mockInsertQuestions.mock.calls[0];
    expect(accepted).toEqual([
      {
        type: "write",
        question: "สรุปใจความหลัก",
        guideAnswer: "แนวเฉลยนำเข้า",
      },
    ]);
    expect(dialog.textContent).toContain("Added");
  });

  it("portals to document.body so editor-main click handlers cannot steal input focus", () => {
    const ed = makeEditor("");
    const stealFocus = vi.fn();
    const editorMain = document.createElement("main");
    editorMain.onclick = stealFocus;
    document.body.appendChild(editorMain);

    render(
      <AiDraftDialog editor={ed as unknown as ReactEditor} onClose={() => {}} />,
    );
    const dialog = dialogEl();
    expect(dialog.parentElement).toBe(document.body);

    const input = dialog.querySelector("input") as HTMLInputElement;
    act(() => {
      input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(stealFocus).not.toHaveBeenCalled();

    editorMain.remove();
  });
});

describe("AiDraftLauncher — empty-doc CTA", () => {
  it("shows only while the doc is effectively empty", () => {
    const ed = makeEditor("");
    const el = render(
      <AiDraftLauncher editor={ed as unknown as ReactEditor} variant="cta" />,
    );
    expect(el.textContent).toContain("Start with AI");

    act(() => {
      ed.commands.insertContent("<p>เริ่มพิมพ์แล้ว</p>");
    });
    expect(el.textContent).not.toContain("Start with AI");
  });
});
