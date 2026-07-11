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

/** Insert target: a single position or a range to replace. */
export type InsertPoint = number | { from: number; to: number };

/**
 * Where "insert at the caret" should land for block-level AI content
 * (Tier 3.5.G — the outline used to land at doc top, ignoring the teacher's
 * cursor):
 * - effectively-empty doc → 0
 * - caret on an empty paragraph → replace that paragraph (no stray blank line)
 * - otherwise → right after the top-level block holding the caret
 */
export function caretInsertPoint(editor: Editor): InsertPoint {
  if (isDocEffectivelyEmpty(editor)) return 0;
  const { $to } = editor.state.selection;
  if ($to.depth === 0) return $to.pos;
  const block = $to.node(1);
  const from = $to.before(1);
  const to = $to.after(1);
  if (block.type.name === "paragraph" && block.content.size === 0) {
    return { from, to };
  }
  return to;
}

/**
 * Insert AI markdown at a position (tiptap-markdown parses string content —
 * the same sanctioned path as the writing assistant).
 */
export function insertMarkdownAt(
  editor: Editor,
  pos: InsertPoint,
  markdown: string,
): void {
  editor.chain().focus().insertContentAt(pos, markdown).run();
}

export function docEndPos(editor: Editor): number {
  return editor.state.doc.content.size;
}
