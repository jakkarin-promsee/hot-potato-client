import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
  collectSectionHeadingFixes,
  stripLeadingSectionNumber,
} from "../numberedSectionHeadings";

describe("stripLeadingSectionNumber", () => {
  it("removes a leading section number prefix", () => {
    expect(stripLeadingSectionNumber("1. ลิมิตของฟังก์ชัน")).toBe(
      "ลิมิตของฟังก์ชัน",
    );
    expect(stripLeadingSectionNumber("12.Continuity")).toBe("Continuity");
  });

  it("leaves titles without a numeric prefix alone", () => {
    expect(stripLeadingSectionNumber("ลิมิตของฟังก์ชัน")).toBe(
      "ลิมิตของฟังก์ชัน",
    );
  });
});

describe("collectSectionHeadingFixes", () => {
  it("targets only level-2 headings that still carry manual numbers", () => {
    const editor = new Editor({
      extensions: [StarterKit],
      content:
        "<h1>บทเรียนแคลคูลัส</h1><h2>1. ลิมิตของฟังก์ชัน</h2><h3>1.1 ย่อย</h3><h2>2. ความต่อเนื่อง</h2>",
    });

    const fixes = collectSectionHeadingFixes(editor.state.doc);
    expect(fixes).toHaveLength(2);
    expect(fixes.map((f) => f.text)).toEqual([
      "ลิมิตของฟังก์ชัน",
      "ความต่อเนื่อง",
    ]);

    editor.destroy();
  });
});
