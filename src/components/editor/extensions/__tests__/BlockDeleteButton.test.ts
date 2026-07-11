import { describe, it, expect, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import { deleteBlock } from "../BlockDeleteButton";

function fakeEditor(nodeSize = 4) {
  const run = vi.fn();
  const chain = {
    focus: vi.fn().mockReturnThis(),
    deleteRange: vi.fn().mockReturnThis(),
    run,
  };
  const editor = {
    state: {
      doc: {
        nodeAt: vi.fn(() => ({ nodeSize })),
      },
    },
    chain: () => chain,
  } as unknown as Editor;
  return { editor, chain, run };
}

describe("deleteBlock", () => {
  it("deletes the node at getPos()", () => {
    const { editor, chain, run } = fakeEditor(9);
    const getPos = () => 12;

    expect(deleteBlock(editor, getPos)).toBe(true);
    expect(chain.deleteRange).toHaveBeenCalledWith({ from: 12, to: 21 });
    expect(run).toHaveBeenCalled();
  });

  it("returns false when getPos is unavailable", () => {
    const { editor, run } = fakeEditor();
    expect(deleteBlock(editor, false)).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });
});
