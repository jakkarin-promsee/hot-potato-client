/**
 * Document helpers for the AI draft dialog (Tier 3.5.E).
 */
import type { Editor } from "@tiptap/react";

/** True when the doc is a single empty paragraph (a brand-new lesson). */
export function isDocEffectivelyEmpty(editor: Editor): boolean {
  const doc = editor.state.doc;
  if (doc.childCount !== 1) return false;
  const first = doc.firstChild;
  return !!first && first.type.name === "paragraph" && first.content.size === 0;
}

export interface HeadingEntry {
  level: number;
  text: string;
  /** Position right after the heading node — where section content goes. */
  insertPos: number;
}

/** All ##/### (and #) headings in document order. */
export function listHeadings(editor: Editor): HeadingEntry[] {
  const headings: HeadingEntry[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      const text = node.textContent.trim();
      if (text) {
        headings.push({
          level: Number(node.attrs.level ?? 1),
          text,
          insertPos: pos + node.nodeSize,
        });
      }
    }
    return true;
  });
  return headings;
}

/** Compact outline snapshot of the current doc for the draft_section prompt. */
export function outlineSnapshot(editor: Editor, cap = 4000): string {
  return listHeadings(editor)
    .map((h) => `${"#".repeat(Math.min(h.level, 6))} ${h.text}`)
    .join("\n")
    .slice(0, cap);
}

/**
 * Insert AI markdown at a position (tiptap-markdown parses string content —
 * the same sanctioned path as the writing assistant).
 */
export function insertMarkdownAt(
  editor: Editor,
  pos: number,
  markdown: string,
): void {
  editor.chain().focus().insertContentAt(pos, markdown).run();
}

export function docEndPos(editor: Editor): number {
  return editor.state.doc.content.size;
}
