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
  NodeViewWrapper: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

vi.mock("@/stores/language.store", () => ({
  useLanguageStore: (selector: (s: { language: "en" | "th" }) => unknown) =>
    selector({ language: "en" }),
}));

vi.mock("@/stores/canvas.store", () => ({
  useCanvasStore: (selector: (s: { contentId: string | null }) => unknown) =>
    selector({ contentId: "content-1" }),
}));

import AiFormulaPanel from "../AiFormulaPanel";
import FormulaCanvas from "../FormulaCanvas";

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

function findButton(el: HTMLElement, text: string): HTMLButtonElement {
  const btn = [...el.querySelectorAll("button")].find((b) =>
    (b.textContent ?? "").includes(text),
  );
  if (!btn) throw new Error(`button "${text}" not found`);
  return btn as HTMLButtonElement;
}

function setInputValue(input: HTMLInputElement, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function expandAndFill(el: HTMLElement, values: [string, string, string]) {
  act(() => {
    findButton(el, "Let AI write the LaTeX").click();
  });
  const inputs = [...el.querySelectorAll("input")] as HTMLInputElement[];
  expect(inputs).toHaveLength(3);
  values.forEach((v, i) => v && setInputValue(inputs[i], v));
}

describe("AiFormulaPanel", () => {
  it("collapsed by default; requires formula + description before submit", async () => {
    const onLatex = vi.fn();
    const el = render(<AiFormulaPanel onLatex={onLatex} renderFailed={false} />);
    expect(el.querySelectorAll("input")).toHaveLength(0); // collapsed

    await expandAndFill(el, ["s = ut + 1/2at^2", "", ""]);
    expect(
      findButton(el, "Generate formula").hasAttribute("disabled"),
    ).toBe(true);
    expect(mockCallCreator).not.toHaveBeenCalled();
  });

  it("submits the three fields and hands LaTeX to the parent (with note)", async () => {
    mockCallCreator.mockResolvedValueOnce({
      latex: "s = ut + \\frac{1}{2}at^2",
      note: "เดาว่า u คือความเร็วต้น",
    });
    const onLatex = vi.fn();
    const el = render(<AiFormulaPanel onLatex={onLatex} renderFailed={false} />);

    await expandAndFill(el, [
      "s = ut + 1/2at^2",
      "สมการการเคลื่อนที่",
      "ใช้คำนวณระยะทาง",
    ]);
    await act(async () => {
      findButton(el, "Generate formula").click();
    });

    expect(mockCallCreator).toHaveBeenCalledWith("content-1", "formula_latex", {
      formulaText: "s = ut + 1/2at^2",
      description: "สมการการเคลื่อนที่",
      usage: "ใช้คำนวณระยะทาง",
    });
    expect(onLatex).toHaveBeenCalledWith("s = ut + \\frac{1}{2}at^2");
    expect(el.textContent).toContain("เดาว่า u คือความเร็วต้น");
  });

  it("shows the retry hint when the current latex fails to render", () => {
    const el = render(<AiFormulaPanel onLatex={() => {}} renderFailed={true} />);
    act(() => {
      findButton(el, "Let AI write the LaTeX").click();
    });
    expect(el.textContent).toContain("doesn't render");
  });
});

describe("FormulaCanvas integration", () => {
  function renderCanvas(editable: boolean) {
    const nodeAttrs: Record<string, unknown> = {
      id: "f1",
      formula: undefined,
      latex: "",
    };
    const updateAttributes = vi.fn((patch: Record<string, unknown>) => {
      Object.assign(nodeAttrs, patch);
    });
    const props = {
      node: { attrs: nodeAttrs },
      selected: false,
      getPos: () => 0,
      updateAttributes,
      editor: { isEditable: editable, state: { doc: { nodeAt: () => null } } },
    } as unknown as NodeViewProps;
    const el = render(<FormulaCanvas {...props} />);
    return { el, updateAttributes, nodeAttrs };
  }

  it("shows the AI panel in edit mode only", () => {
    const editMode = renderCanvas(true);
    expect(editMode.el.textContent).toContain("Let AI write the LaTeX");

    act(() => root?.unmount());
    container?.remove();

    const viewMode = renderCanvas(false);
    expect(viewMode.el.textContent).not.toContain("Let AI write the LaTeX");
  });

  it("AI result lands in the latex attr through persistLatex", async () => {
    mockCallCreator.mockResolvedValueOnce({ latex: "E = mc^2" });
    const { el, updateAttributes } = renderCanvas(true);

    await expandAndFill(el, ["E = mc2", "สมการพลังงาน", ""]);
    await act(async () => {
      findButton(el, "Generate formula").click();
    });

    expect(updateAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ latex: "E = mc^2" }),
    );
    const textarea = el.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.value).toBe("E = mc^2");
  });
});
