// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import type { Editor as ReactEditor } from "@tiptap/react";
import {
  docEndPos,
  formatHeadingOptionLabel,
  insertMarkdownAt,
  isDocEffectivelyEmpty,
  listHeadings,
  outlineSnapshot,
} from "../draftHelpers";

function makeEditor(content: string): Editor {
  return new Editor({ extensions: [StarterKit, Markdown], content });
}

const asReact = (e: Editor) => e as unknown as ReactEditor;

describe("isDocEffectivelyEmpty", () => {
  it("true for a brand-new doc (single empty paragraph)", () => {
    const editor = makeEditor("");
    expect(isDocEffectivelyEmpty(asReact(editor))).toBe(true);
    editor.destroy();
  });

  it("false once anything exists", () => {
    const withText = makeEditor("<p>ก</p>");
    expect(isDocEffectivelyEmpty(asReact(withText))).toBe(false);
    withText.destroy();

    const twoBlocks = makeEditor("<p></p><p></p>");
    expect(isDocEffectivelyEmpty(asReact(twoBlocks))).toBe(false);
    twoBlocks.destroy();
  });
});

describe("listHeadings / outlineSnapshot", () => {
  it("lists headings in document order with levels and insert positions", () => {
    const editor = makeEditor(
      "<h2>บทนำ</h2><p>เนื้อหา</p><h3>แรงเสียดทาน</h3><p>ท้าย</p>",
    );
    const headings = listHeadings(asReact(editor));
    expect(headings.map((h) => h.text)).toEqual(["บทนำ", "แรงเสียดทาน"]);
    expect(headings.map((h) => h.level)).toEqual([2, 3]);
    expect(headings.map((h) => h.sectionNumber)).toEqual([1, null]);
    expect(formatHeadingOptionLabel(headings[0])).toBe("1. บทนำ");
    expect(formatHeadingOptionLabel(headings[1])).toBe("–– แรงเสียดทาน");
    // insertPos = right after the heading node
    expect(headings[0].insertPos).toBeGreaterThan(0);
    expect(outlineSnapshot(asReact(editor))).toBe("## บทนำ\n### แรงเสียดทาน");
    editor.destroy();
  });

  it("numbers only top-level H2 sections in display order", () => {
    const editor = makeEditor(
      "<h2>หนึ่ง</h2><h2>สอง</h2><blockquote><h2>ใน quote</h2></blockquote>",
    );
    const headings = listHeadings(asReact(editor));
    expect(headings.map((h) => h.sectionNumber)).toEqual([1, 2, null]);
    expect(formatHeadingOptionLabel(headings[0])).toBe("1. หนึ่ง");
    expect(formatHeadingOptionLabel(headings[1])).toBe("2. สอง");
    expect(formatHeadingOptionLabel(headings[2])).toBe("– ใน quote");
    editor.destroy();
  });

  it("resets H2 section numbers after each top-level H1", () => {
    const editor = makeEditor(
      "<h1>บทที่หนึ่ง</h1><h2>เปิด</h2><h2>ปิด</h2><h1>บทที่สอง</h1><h2>เริ่มใหม่</h2>",
    );
    const headings = listHeadings(asReact(editor));
    expect(headings.map((h) => h.sectionNumber)).toEqual([null, 1, 2, null, 1]);
    expect(formatHeadingOptionLabel(headings[1])).toBe("1. เปิด");
    expect(formatHeadingOptionLabel(headings[2])).toBe("2. ปิด");
    expect(formatHeadingOptionLabel(headings[4])).toBe("1. เริ่มใหม่");
    editor.destroy();
  });

  it("skips empty headings", () => {
    const editor = makeEditor("<h2></h2><h2>จริง</h2>");
    expect(listHeadings(asReact(editor)).map((h) => h.text)).toEqual(["จริง"]);
    editor.destroy();
  });
});

describe("insertMarkdownAt", () => {
  it("inserts an outline's markdown headings as real heading nodes at doc start", () => {
    const editor = makeEditor("<p>ของเดิม</p>");
    insertMarkdownAt(
      asReact(editor),
      0,
      "## หัวข้อหนึ่ง\n\n*สรุปสั้น*\n\n## หัวข้อสอง",
    );
    const types = (editor.getJSON().content ?? []).map((n) => n.type);
    expect(types[0]).toBe("heading");
    const headings = listHeadings(asReact(editor));
    expect(headings.map((h) => h.text)).toEqual(["หัวข้อหนึ่ง", "หัวข้อสอง"]);
    // Original content survives at the end
    expect(editor.state.doc.textContent).toContain("ของเดิม");
    editor.destroy();
  });

  it("inserts section content right below the chosen heading", () => {
    const editor = makeEditor("<h2>บทนำ</h2><h2>สรุป</h2>");
    const [intro] = listHeadings(asReact(editor));
    insertMarkdownAt(asReact(editor), intro.insertPos, "เนื้อหาบทนำจ้า");
    const text = editor.state.doc
      .textBetween(0, editor.state.doc.content.size, "\n")
      // tiptap-markdown's insert leaves a trailing empty paragraph — harmless
      .replace(/\n+$/, "");
    expect(text).toBe("บทนำ\nเนื้อหาบทนำจ้า\nสรุป");
    editor.destroy();
  });

  it("docEndPos appends at the very end", () => {
    const editor = makeEditor("<p>หนึ่ง</p>");
    insertMarkdownAt(asReact(editor), docEndPos(asReact(editor)), "สอง");
    const text = editor.state.doc
      .textBetween(0, editor.state.doc.content.size, "\n")
      .replace(/\n+$/, "");
    expect(text).toBe("หนึ่ง\nสอง");
    editor.destroy();
  });
});
