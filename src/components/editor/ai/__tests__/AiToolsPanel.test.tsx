// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import type { Editor as ReactEditor } from "@tiptap/react";

const { mockCallCreator, mockSaveContent } = vi.hoisted(() => ({
  mockCallCreator: vi.fn(),
  mockSaveContent: vi.fn(async () => {}),
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
  useCanvasStore: (
    selector: (s: {
      contentId: string | null;
      saveContent: () => Promise<void>;
      isDirty: boolean;
    }) => unknown,
  ) =>
    selector({
      contentId: "content-1",
      saveContent: mockSaveContent,
      isDirty: false,
    }),
}));

import AiToolsPanel from "../AiToolsPanel";

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
  mockSaveContent.mockClear();
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

function closeDialog(el: HTMLElement) {
  const btn = el.querySelector('button[aria-label="Close"]');
  if (!btn) throw new Error("dialog close button not found");
  (btn as HTMLButtonElement).click();
}

function draftDialogEl(): HTMLElement {
  const modal = document.querySelector("[data-editor-modal]");
  if (!modal) throw new Error("AiDraftDialog portal not mounted");
  return modal as HTMLElement;
}

describe("AiToolsPanel — the sidebar AI hub (3.5.G)", () => {
  it("renders every AI tool as a card with a description", () => {
    const ed = makeEditor("");
    const el = render(
      <AiToolsPanel editor={ed as unknown as ReactEditor} />,
    );
    for (const title of [
      "Draft an outline",
      "Import existing material",
      "Fill a section",
      "Improve selected text",
      "Generate questions with AI",
      "Review the lesson",
    ]) {
      expect(el.textContent).toContain(title);
    }
    // Workflow group labels guide the teacher top to bottom
    expect(el.textContent).toContain("1 · Start a lesson");
    expect(el.textContent).toContain("4 · Before publishing");
  });

  it("opens the draft dialog on the right tab per card", () => {
    const ed = makeEditor("");
    const el = render(
      <AiToolsPanel editor={ed as unknown as ReactEditor} />,
    );

    act(() => {
      findButton(el, "Draft an outline").click();
    });
    expect(draftDialogEl().textContent).toContain("Lesson topic");
    act(() => {
      closeDialog(draftDialogEl());
    });

    act(() => {
      findButton(el, "Fill a section").click();
    });
    // Empty doc → the fill tab's no-headings hint proves we landed on it
    expect(draftDialogEl().textContent).toContain("No headings yet");
    act(() => {
      closeDialog(draftDialogEl());
    });

    act(() => {
      findButton(el, "Import existing material").click();
    });
    expect(draftDialogEl().textContent).toContain("Restructure into a lesson");
  });

  it("opens the question dialog from the questions card", () => {
    const ed = makeEditor("");
    const el = render(
      <AiToolsPanel editor={ed as unknown as ReactEditor} />,
    );
    act(() => {
      findButton(el, "Generate questions with AI").click();
    });
    expect(el.textContent).toContain("Source content");
    expect(el.textContent).toContain("Whole lesson");
  });

  it("runs the critic from the review card and caches the report", async () => {
    mockCallCreator.mockResolvedValueOnce({
      summary: "บทเรียนอ่านลื่นมาก",
      issues: [],
      checklist: [{ item: "มีคำนำ", pass: true }],
    });
    const ed = makeEditor("");
    const el = render(
      <AiToolsPanel editor={ed as unknown as ReactEditor} />,
    );

    await act(async () => {
      findButton(el, "Review the lesson").click();
    });
    expect(mockCallCreator).toHaveBeenCalledWith("content-1", "critic", {});
    expect(el.textContent).toContain("บทเรียนอ่านลื่นมาก");

    // Close and reopen — cached report, no second AI call
    act(() => {
      closeDialog(el);
    });
    await act(async () => {
      findButton(el, "Review the lesson").click();
    });
    expect(mockCallCreator).toHaveBeenCalledTimes(1);
    expect(el.textContent).toContain("บทเรียนอ่านลื่นมาก");
  });
});
