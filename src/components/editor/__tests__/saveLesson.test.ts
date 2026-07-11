import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Editor } from "@tiptap/react";
import { isSaveShortcut, saveLessonNow } from "../saveLesson";

const { mockSetTiptapJson, mockSaveContent } = vi.hoisted(() => ({
  mockSetTiptapJson: vi.fn(),
  mockSaveContent: vi.fn(async () => {}),
}));

vi.mock("@/stores/canvas.store", () => ({
  useCanvasStore: {
    getState: () => ({
      setTiptapJson: mockSetTiptapJson,
      saveContent: mockSaveContent,
    }),
  },
}));

describe("isSaveShortcut", () => {
  it("matches Ctrl+S and Cmd+S", () => {
    expect(
      isSaveShortcut({ ctrlKey: true, key: "s", code: "KeyS" } as KeyboardEvent),
    ).toBe(true);
    expect(
      isSaveShortcut({ metaKey: true, key: "S", code: "KeyS" } as KeyboardEvent),
    ).toBe(true);
  });

  it("ignores plain S", () => {
    expect(
      isSaveShortcut({ key: "s", code: "KeyS" } as KeyboardEvent),
    ).toBe(false);
  });
});

describe("saveLessonNow", () => {
  beforeEach(() => {
    mockSetTiptapJson.mockClear();
    mockSaveContent.mockClear();
  });

  it("flushes editor JSON before saving", async () => {
    const editor = {
      getJSON: () => ({ type: "doc", content: [] }),
    } as unknown as Editor;

    await saveLessonNow(editor);

    expect(mockSetTiptapJson).toHaveBeenCalledWith(
      JSON.stringify({ type: "doc", content: [] }),
    );
    expect(mockSaveContent).toHaveBeenCalledTimes(1);
  });

  it("saves without flushing when no editor is passed", async () => {
    await saveLessonNow();
    expect(mockSetTiptapJson).not.toHaveBeenCalled();
    expect(mockSaveContent).toHaveBeenCalledTimes(1);
  });
});
