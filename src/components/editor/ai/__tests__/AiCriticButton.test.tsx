// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { Editor } from "@tiptap/react";

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
      isDirty: true,
    }),
}));

import AiCriticButton from "../AiCriticButton";

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
  mockSaveContent.mockClear();
});

const fakeEditor = {} as unknown as Editor;

function findButton(el: HTMLElement, text: string): HTMLButtonElement {
  const btn = [...el.querySelectorAll("button")].find((b) =>
    (b.textContent ?? "").includes(text),
  );
  if (!btn) throw new Error(`button "${text}" not found`);
  return btn as HTMLButtonElement;
}

function findCloseButton(el: HTMLElement): HTMLButtonElement {
  const btn = el.querySelector('button[aria-label="Close"]');
  if (!btn) throw new Error("close button not found");
  return btn as HTMLButtonElement;
}

const REPORT = {
  summary: "บทเรียนอ่านลื่น มีตัวอย่างชัดเจนมาก",
  issues: [
    {
      area: "readability",
      severity: "info",
      where: "หัวข้อที่ 2",
      note: "ประโยคค่อนข้างยาว",
      suggestion: "ลองแบ่งเป็นสองประโยค",
    },
    {
      area: "accuracy",
      severity: "warn",
      where: "",
      note: "ตัวเลขในตัวอย่างไม่ตรงกับสูตร",
    },
  ],
  checklist: [
    { item: "มีคำนำ/เกริ่น", pass: true },
    { item: "มีคำถามอย่างน้อย 3 ข้อ", pass: false },
  ],
};

describe("AiCriticButton", () => {
  it("saves dirty edits first, then renders summary/checklist/issues", async () => {
    mockCallCreator.mockResolvedValueOnce(REPORT);
    const el = render(<AiCriticButton editor={fakeEditor} />);

    await act(async () => {
      findButton(el, "Review").click();
    });

    expect(mockSaveContent).toHaveBeenCalledTimes(1); // isDirty: true → flush
    expect(mockCallCreator).toHaveBeenCalledWith("content-1", "critic", {});
    expect(el.textContent).toContain("บทเรียนอ่านลื่น");
    expect(el.textContent).toContain("มีคำนำ/เกริ่น");
    expect(el.textContent).toContain("ประโยคค่อนข้างยาว");
    expect(el.textContent).toContain("ลองแบ่งเป็นสองประโยค");
    expect(el.textContent).toContain("Accuracy"); // warn issue area badge
  });

  it("shows the celebratory empty state when there are no issues", async () => {
    mockCallCreator.mockResolvedValueOnce({ ...REPORT, issues: [] });
    const el = render(<AiCriticButton editor={fakeEditor} />);

    await act(async () => {
      findButton(el, "Review").click();
    });
    expect(el.textContent).toContain("Looks great! 🎉");
  });

  it("shows a friendly error and Try again re-calls", async () => {
    mockCallCreator
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(REPORT);
    const el = render(<AiCriticButton editor={fakeEditor} />);

    await act(async () => {
      findButton(el, "Review").click();
    });
    expect(el.textContent).toContain("AI is busy");

    await act(async () => {
      findButton(el, "Try again").click();
    });
    expect(mockCallCreator).toHaveBeenCalledTimes(2);
    expect(el.textContent).toContain("บทเรียนอ่านลื่น");
  });

  it("asks for confirmation before closing while the review is visible", async () => {
    mockCallCreator.mockResolvedValueOnce(REPORT);
    const el = render(<AiCriticButton editor={fakeEditor} />);

    await act(async () => {
      findButton(el, "Review").click();
    });
    expect(el.textContent).toContain("บทเรียนอ่านลื่น");

    act(() => {
      findCloseButton(el).click();
    });
    expect(document.body.textContent).toContain("Leave this dialog?");

    act(() => {
      findButton(document.body as HTMLElement, "Stay").click();
    });
    expect(document.body.textContent).not.toContain("Leave this dialog?");
  });

  it("closes immediately after an error with no cached report", async () => {
    mockCallCreator.mockRejectedValueOnce(new Error("boom"));
    const el = render(<AiCriticButton editor={fakeEditor} />);

    await act(async () => {
      findButton(el, "Review").click();
    });
    expect(el.textContent).toContain("AI is busy");

    act(() => {
      findCloseButton(el).click();
    });
    expect(document.body.textContent).not.toContain("Leave this dialog?");
  });
});
