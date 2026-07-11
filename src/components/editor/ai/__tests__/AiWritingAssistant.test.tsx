// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import type { Editor as ReactEditor } from "@tiptap/react";

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

import AiWritingAssistant, { AiWritingToolCard } from "../AiWritingAssistant";
import { useCreatorGradeLevelStore } from "@/stores/creatorGradeLevel.store";

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
  localStorage.clear();
  useCreatorGradeLevelStore.setState({ gradeLevel: "" });
});

function selectAllText(ed: Editor) {
  // Whole paragraph text: doc = <p>text</p>, text spans [1, size - 1]
  ed.commands.setTextSelection({ from: 1, to: ed.state.doc.content.size - 1 });
}

function makeEditorWithSelection(): Editor {
  editor = new Editor({
    extensions: [StarterKit, Markdown],
    content: "<p>ประโยคเดิมที่มีคำผิk</p>",
  });
  selectAllText(editor);
  return editor;
}

function findButton(el: HTMLElement, text: string): HTMLButtonElement {
  const btn = [...el.querySelectorAll("button")].find((b) =>
    (b.textContent ?? "").includes(text),
  );
  if (!btn) throw new Error(`button "${text}" not found`);
  return btn as HTMLButtonElement;
}

describe("AiWritingAssistant", () => {
  it("stays clickable without a selection and shows the select-first how-to (3.5.G)", () => {
    editor = new Editor({
      extensions: [StarterKit, Markdown],
      content: "<p>ไม่มีการเลือก</p>",
    });
    const el = render(
      <AiWritingAssistant editor={editor as unknown as ReactEditor} />,
    );
    const btn = findButton(el, "AI text");
    expect(btn.hasAttribute("disabled")).toBe(false);

    act(() => {
      btn.click();
    });
    // Guidance instead of actions — no dead-end for low-tech teachers
    expect(el.textContent).toContain("Not selected yet");
    expect(el.textContent).toContain("Drag over the text");
    expect(
      [...el.querySelectorAll("button")].some((b) =>
        (b.textContent ?? "").includes("Fix typos"),
      ),
    ).toBe(false);
  });

  it("proofread action sends the selection with the right preset and previews", async () => {
    mockCallCreator.mockResolvedValueOnce({ markdown: "ประโยคเดิมที่มีคำผิด" });
    const ed = makeEditorWithSelection();
    const el = render(
      <AiWritingAssistant editor={ed as unknown as ReactEditor} />,
    );

    act(() => {
      findButton(el, "AI text").click();
    });
    await act(async () => {
      findButton(el, "Fix typos").click();
    });

    expect(mockCallCreator).toHaveBeenCalledWith("content-1", "proofread", {
      markdown: "ประโยคเดิมที่มีคำผิk",
      preset: "proofread",
      gradeLevel: undefined,
    });
    // Before/after preview visible, doc untouched so far
    expect(el.textContent).toContain("ประโยคเดิมที่มีคำผิk");
    expect(el.textContent).toContain("ประโยคเดิมที่มีคำผิด");
    expect(ed.state.doc.textContent).toBe("ประโยคเดิมที่มีคำผิk");
  });

  it("Apply replaces exactly the selection; Cancel leaves the doc unchanged", async () => {
    mockCallCreator.mockResolvedValue({ markdown: "ประโยคใหม่เอี่ยม" });
    const ed = makeEditorWithSelection();
    const el = render(
      <AiWritingAssistant editor={ed as unknown as ReactEditor} />,
    );

    // Round 1 — cancel
    const before = JSON.stringify(ed.getJSON());
    act(() => {
      findButton(el, "AI text").click();
    });
    await act(async () => {
      findButton(el, "Fix typos").click();
    });
    act(() => {
      findButton(el, "Cancel").click();
    });
    expect(JSON.stringify(ed.getJSON())).toBe(before);

    // Round 2 — apply
    selectAllText(ed);
    act(() => {
      findButton(el, "AI text").click();
    });
    await act(async () => {
      findButton(el, "Fix typos").click();
    });
    act(() => {
      findButton(el, "Apply").click();
    });
    expect(ed.state.doc.textContent).toBe("ประโยคใหม่เอี่ยม");
  });

  it("reading_level asks for a grade before calling the AI", async () => {
    mockCallCreator.mockResolvedValueOnce({ markdown: "ฉบับ ป.4" });
    const ed = makeEditorWithSelection();
    const el = render(
      <AiWritingAssistant editor={ed as unknown as ReactEditor} />,
    );

    act(() => {
      findButton(el, "AI text").click();
    });
    act(() => {
      findButton(el, "Adjust to grade level").click();
    });
    // Dialog open, no call yet — waits for the grade pick
    expect(mockCallCreator).not.toHaveBeenCalled();
    expect(el.querySelector("select")).toBeTruthy();

    await act(async () => {
      findButton(el, "Adjust").click();
    });
    expect(mockCallCreator).toHaveBeenCalledWith("content-1", "proofread", {
      markdown: "ประโยคเดิมที่มีคำผิk",
      preset: "reading_level",
      gradeLevel: "ป.4",
    });
    expect(el.textContent).toContain("ฉบับ ป.4");
  });

  it("shows retry on AI failure without touching the doc", async () => {
    mockCallCreator.mockRejectedValueOnce(new Error("boom"));
    const ed = makeEditorWithSelection();
    const before = JSON.stringify(ed.getJSON());
    const el = render(
      <AiWritingAssistant editor={ed as unknown as ReactEditor} />,
    );

    act(() => {
      findButton(el, "AI text").click();
    });
    await act(async () => {
      findButton(el, "Fix typos").click();
    });

    expect(el.textContent).toContain("AI is busy");
    expect(findButton(el, "Try again")).toBeTruthy();
    expect(findButton(el, "Apply").hasAttribute("disabled")).toBe(true);
    expect(JSON.stringify(ed.getJSON())).toBe(before);
  });
});

describe("AiWritingToolCard (sidebar hub, 3.5.G)", () => {
  it("shows the how-to and disables actions without a selection", () => {
    editor = new Editor({
      extensions: [StarterKit, Markdown],
      content: "<p>ไม่มีการเลือก</p>",
    });
    const el = render(
      <AiWritingToolCard editor={editor as unknown as ReactEditor} />,
    );
    expect(el.textContent).toContain("Not selected yet");
    expect(findButton(el, "Fix typos").hasAttribute("disabled")).toBe(true);
  });

  it("shows the selection snippet and runs an action end to end", async () => {
    mockCallCreator.mockResolvedValueOnce({ markdown: "ประโยคเดิมที่มีคำผิด" });
    const ed = makeEditorWithSelection();
    const el = render(
      <AiWritingToolCard editor={ed as unknown as ReactEditor} />,
    );

    expect(el.textContent).toContain("Selected:");
    expect(el.textContent).toContain("ประโยคเดิมที่มีคำผิk");

    await act(async () => {
      findButton(el, "Fix typos").click();
    });
    expect(mockCallCreator).toHaveBeenCalledWith("content-1", "proofread", {
      markdown: "ประโยคเดิมที่มีคำผิk",
      preset: "proofread",
      gradeLevel: undefined,
    });

    act(() => {
      findButton(el, "Apply").click();
    });
    expect(ed.state.doc.textContent).toBe("ประโยคเดิมที่มีคำผิด");
  });
});
