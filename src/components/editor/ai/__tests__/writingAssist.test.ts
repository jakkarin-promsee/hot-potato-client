// @vitest-environment happy-dom
/**
 * Round-trip test of the sanctioned markdown-insertion path (plan §1.1):
 * a REAL headless TipTap editor with tiptap-markdown, so a future
 * tiptap-markdown upgrade changing `insertContentAt` behavior fails loudly.
 */
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import type { Editor as ReactEditor } from "@tiptap/react";
import {
  getSelectionSnapshot,
  replaceRangeWithMarkdown,
} from "../writingAssist";

function makeEditor(content: string): Editor {
  return new Editor({
    extensions: [StarterKit, Markdown],
    content,
  });
}

describe("getSelectionSnapshot", () => {
  it("returns null for an empty selection", () => {
    const editor = makeEditor("<p>สวัสดีครับนักเรียน</p>");
    editor.commands.setTextSelection(3);
    expect(getSelectionSnapshot(editor as unknown as ReactEditor)).toBeNull();
    editor.destroy();
  });

  it("captures range + plain text for a real selection", () => {
    const editor = makeEditor("<p>สวัสดีครับนักเรียน</p>");
    editor.commands.setTextSelection({ from: 1, to: 7 });
    const snap = getSelectionSnapshot(editor as unknown as ReactEditor);
    expect(snap).toEqual({ from: 1, to: 7, text: "สวัสดี" });
    editor.destroy();
  });
});

describe("replaceRangeWithMarkdown (real tiptap-markdown round trip)", () => {
  it("replaces exactly the selected range and parses markdown to nodes", () => {
    const editor = makeEditor("<p>คำนำเดิม</p><p>ท้ายบทเดิม</p>");
    // Select the first paragraph's text
    editor.commands.setTextSelection({ from: 1, to: 9 });
    const snap = getSelectionSnapshot(editor as unknown as ReactEditor)!;
    expect(snap.text).toBe("คำนำเดิม");

    replaceRangeWithMarkdown(editor as unknown as ReactEditor, snap, [
      "## หัวข้อใหม่",
      "",
      "ข้อความ **สำคัญ** หนึ่งย่อหน้า",
    ].join("\n"));

    const json = editor.getJSON();
    const types = (json.content ?? []).map((n) => n.type);
    // Markdown string became real heading + paragraph nodes
    expect(types[0]).toBe("heading");
    expect(json.content?.[0]?.attrs?.level).toBe(2);
    const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n");
    expect(text).toContain("หัวข้อใหม่");
    expect(text).toContain("ข้อความ สำคัญ หนึ่งย่อหน้า");
    // The untouched second paragraph survives
    expect(text).toContain("ท้ายบทเดิม");
    expect(text).not.toContain("คำนำเดิม");
    editor.destroy();
  });

  it("bold markdown lands as a bold mark", () => {
    const editor = makeEditor("<p>xxxx</p>");
    editor.commands.setTextSelection({ from: 1, to: 5 });
    replaceRangeWithMarkdown(
      editor as unknown as ReactEditor,
      { from: 1, to: 5 },
      "คำ **หนา** จ้า",
    );
    let sawBold = false;
    editor.state.doc.descendants((node) => {
      if (node.isText && node.marks.some((m) => m.type.name === "bold")) {
        sawBold = true;
      }
    });
    expect(sawBold).toBe(true);
    editor.destroy();
  });

  it("cancel path: not calling replace leaves the doc byte-identical", () => {
    const editor = makeEditor("<p>ห้ามแตะเนื้อหานี้</p>");
    const before = JSON.stringify(editor.getJSON());
    editor.commands.setTextSelection({ from: 1, to: 5 });
    getSelectionSnapshot(editor as unknown as ReactEditor); // preview only
    expect(JSON.stringify(editor.getJSON())).toBe(before);
    editor.destroy();
  });
});
