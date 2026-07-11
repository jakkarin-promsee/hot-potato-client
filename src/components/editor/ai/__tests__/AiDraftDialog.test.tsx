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

describe("AiDraftDialog — outline tab", () => {
  it("drafts an outline and inserts it at doc start on accept only", async () => {
    mockCallCreator.mockResolvedValueOnce({
      outlineMarkdown: "## บทนำ\n\n## แรงและการเคลื่อนที่",
    });
    const ed = makeEditor("");
    const el = render(
      <AiDraftDialog editor={ed as unknown as ReactEditor} onClose={() => {}} />,
    );

    setInputValue(
      el.querySelector("input") as HTMLInputElement,
      "แรงและการเคลื่อนที่",
    );
    await act(async () => {
      findButton(el, "Draft outline").click();
    });

    expect(mockCallCreator).toHaveBeenCalledWith("content-1", "outline", {
      topic: "แรงและการเคลื่อนที่",
      gradeLevel: undefined,
      objectives: undefined,
    });
    // Preview shown, doc still empty (T2)
    expect(ed.state.doc.textContent).toBe("");

    act(() => {
      findButton(el, "Insert into lesson").click();
    });
    const headings = listHeadings(ed as unknown as ReactEditor);
    expect(headings.map((h) => h.text)).toEqual([
      "บทนำ",
      "แรงและการเคลื่อนที่",
    ]);
    expect(el.textContent).toContain("Inserted ✓");
  });
});

describe("AiDraftDialog — fill tab", () => {
  it("lists doc headings, drafts a section, and inserts below the heading", async () => {
    mockCallCreator.mockResolvedValueOnce({ markdown: "เนื้อหาบทนำจาก AI" });
    const ed = makeEditor("<h2>บทนำ</h2><h2>สรุป</h2>");
    const el = render(
      <AiDraftDialog
        editor={ed as unknown as ReactEditor}
        onClose={() => {}}
        initialTab="fill"
      />,
    );

    const select = el.querySelector("select") as HTMLSelectElement;
    expect(select.options.length).toBe(2);
    expect(select.options[0].textContent).toContain("บทนำ");

    await act(async () => {
      findButton(el, "Write this section").click();
    });
    expect(mockCallCreator).toHaveBeenCalledWith("content-1", "draft_section", {
      heading: "บทนำ",
      outlineMarkdown: "## บทนำ\n## สรุป",
    });

    act(() => {
      findButton(el, "Insert below heading").click();
    });
    const text = ed.state.doc
      .textBetween(0, ed.state.doc.content.size, "\n")
      .replace(/\n+$/, "");
    expect(text).toBe("บทนำ\nเนื้อหาบทนำจาก AI\nสรุป");
  });

  it("shows the empty-state hint when the doc has no headings", () => {
    const ed = makeEditor("<p>มีแต่ข้อความ</p>");
    const el = render(
      <AiDraftDialog
        editor={ed as unknown as ReactEditor}
        onClose={() => {}}
        initialTab="fill"
      />,
    );
    expect(el.textContent).toContain("No headings yet");
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
    const el = render(
      <AiDraftDialog
        editor={ed as unknown as ReactEditor}
        onClose={() => {}}
        initialTab="import"
      />,
    );

    setInputValue(
      el.querySelector("textarea") as HTMLTextAreaElement,
      "เนื้อหาชีทเก่าของครู",
    );
    await act(async () => {
      findButton(el, "Restructure into a lesson").click();
    });
    expect(mockCallCreator).toHaveBeenCalledWith(
      "content-1",
      "import_structure",
      { rawText: "เนื้อหาชีทเก่าของครู" },
    );
    // Nothing inserted until accepted
    expect(ed.state.doc.textContent).toBe("");

    act(() => {
      findButton(el, "Insert the content").click();
    });
    expect(ed.state.doc.textContent).toContain("เนื้อหาที่จัดแล้ว");

    act(() => {
      findButton(el, "Add to lesson").click();
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
    expect(el.textContent).toContain("Added");
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
