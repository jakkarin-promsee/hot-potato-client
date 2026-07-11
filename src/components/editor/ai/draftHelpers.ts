/**
 * Document helpers for the AI draft dialog (Tier 3.5.E).
 */
import type { Editor } from "@tiptap/react";
import { stripLeadingSectionNumber } from "../extensions/numberedSectionHeadings";

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
  /** Start position of the heading node in the doc. */
  pos: number;
  /** Position right after the heading node — where section content goes. */
  insertPos: number;
  /** 1-based index for top-level H2 sections within the current H1 block. */
  sectionNumber: number | null;
}

/** All ##/### (and #) headings in document order. */
export function listHeadings(editor: Editor): HeadingEntry[] {
  const doc = editor.state.doc;
  const sectionNumberByPos = new Map<number, number>();
  let topLevelH2Count = 0;

  doc.forEach((node, offset) => {
    if (node.type.name !== "heading") return;
    const level = Number(node.attrs.level ?? 1);
    if (level === 1) {
      topLevelH2Count = 0;
      return;
    }
    if (level === 2) {
      topLevelH2Count += 1;
      sectionNumberByPos.set(offset, topLevelH2Count);
    }
  });

  const headings: HeadingEntry[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      const text = node.textContent.trim();
      if (text) {
        headings.push({
          level: Number(node.attrs.level ?? 1),
          text,
          pos,
          insertPos: pos + node.nodeSize,
          sectionNumber: sectionNumberByPos.get(pos) ?? null,
        });
      }
    }
    return true;
  });
  return headings;
}

/** Label for pickers — mirrors the auto `1. 2. 3.` shown on top-level H2 in the editor. */
export function formatHeadingOptionLabel(heading: HeadingEntry): string {
  if (heading.sectionNumber !== null) {
    return `${heading.sectionNumber}. ${heading.text}`;
  }
  const indent = "–".repeat(Math.max(0, heading.level - 1));
  return indent ? `${indent} ${heading.text}` : heading.text;
}

/** Label for placing content at the bottom of a section (before the next heading). */
export function formatHeadingBelowOptionLabel(heading: HeadingEntry): string {
  return `ล่าง ${formatHeadingOptionLabel(heading)}`;
}

/**
 * Remove a leading markdown heading when AI echoes the section title back —
 * fill-tab content inserts *below* the existing heading node, so a repeated
 * `## Title` line would duplicate it in the lesson.
 */
export function stripLeadingSectionHeading(
  markdown: string,
  headingText: string,
): string {
  const target = stripLeadingSectionNumber(headingText.trim());
  let rest = markdown.trimStart();
  let stripped = false;
  while (true) {
    const match = rest.match(/^(#{1,6})\s+(.+?)(?:\r?\n|$)/);
    if (!match) break;
    const title = stripLeadingSectionNumber(match[2].trim());
    if (title !== target) break;
    rest = rest.slice(match[0].length).replace(/^\r?\n+/, "");
    stripped = true;
  }
  return stripped ? rest.trim() : markdown;
}

/**
 * Prepends auto `1. 2. 3.` to top-level `##` lines in AI markdown previews —
 * mirrors the editor CSS counters (resets after each `#` H1 line). On insert,
 * `numberedSectionHeadings` strips the manual prefix again.
 */
export function formatLessonMarkdownPreview(markdown: string): string {
  let sectionNumber = 0;
  return markdown
    .split("\n")
    .map((line) => {
      if (/^###+\s/.test(line)) return line;
      const h2 = line.match(/^##\s+(.+)$/);
      if (h2) {
        sectionNumber += 1;
        const title = stripLeadingSectionNumber(h2[1]);
        return `## ${sectionNumber}. ${title}`;
      }
      if (/^#\s+/.test(line)) {
        sectionNumber = 0;
        return line;
      }
      return line;
    })
    .join("\n");
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

function insertedRange(
  editor: Editor,
  pos: InsertPoint,
  sizeBefore: number,
): { from: number; to: number } {
  const sizeAfter = editor.state.doc.content.size;
  if (typeof pos === "number") {
    return { from: pos, to: pos + (sizeAfter - sizeBefore) };
  }
  const replaced = pos.to - pos.from;
  const insertedLength = sizeAfter - sizeBefore + replaced;
  return { from: pos.from, to: pos.from + insertedLength };
}

/** Tag non-heading blocks in a range as outline-draft scaffold paragraphs. */
function tagOutlineDraftBlocks(
  editor: Editor,
  from: number,
  to: number,
): void {
  const { doc } = editor.state;
  const tr = editor.state.tr;
  let changed = false;

  doc.nodesBetween(from, Math.min(to, doc.content.size), (node, nodePos) => {
    if (node.type.name === "heading") return true;
    if (node.type.name !== "paragraph" || node.attrs.outlineDraft) return true;
    tr.setNodeMarkup(nodePos, undefined, {
      ...node.attrs,
      outlineDraft: true,
    });
    changed = true;
    return false;
  });

  if (changed) editor.view.dispatch(tr);
}

/**
 * Insert an AI lesson outline and mark its description paragraphs so teachers
 * can spot scaffold text they still need to replace or delete.
 */
export function insertOutlineMarkdownAt(
  editor: Editor,
  pos: InsertPoint,
  markdown: string,
): void {
  const sizeBefore = editor.state.doc.content.size;
  insertMarkdownAt(editor, pos, markdown);
  const { from, to } = insertedRange(editor, pos, sizeBefore);
  tagOutlineDraftBlocks(editor, from, to);
}

export function docEndPos(editor: Editor): number {
  return editor.state.doc.content.size;
}

/**
 * Where fill-tab question blocks should land: the end of the active section,
 * right before the next heading at the same or higher outline level (or doc end).
 */
export function sectionEndInsertPos(
  editor: Editor,
  headingIndex: number,
  headings: HeadingEntry[] = listHeadings(editor),
): number {
  const heading = headings[headingIndex];
  if (!heading) return docEndPos(editor);
  for (let i = headingIndex + 1; i < headings.length; i++) {
    if (headings[i].level <= heading.level) {
      return headings[i].pos;
    }
  }
  return docEndPos(editor);
}

/** Plain-text snapshot of one section (heading + body) for AI question prompts. */
export function sectionContentMarkdown(
  editor: Editor,
  headingIndex: number,
  headings: HeadingEntry[] = listHeadings(editor),
): string {
  const heading = headings[headingIndex];
  if (!heading) return "";
  const end = sectionEndInsertPos(editor, headingIndex, headings);
  const hashes = "#".repeat(Math.min(heading.level, 6));
  const body = editor.state.doc.textBetween(heading.insertPos, end, "\n\n").trim();
  return body ? `${hashes} ${heading.text}\n\n${body}` : `${hashes} ${heading.text}`;
}

export function selectedSectionsMarkdown(
  editor: Editor,
  selectedIndices: number[],
  headings: HeadingEntry[] = listHeadings(editor),
  cap = 12000,
): string {
  return [...selectedIndices]
    .sort((a, b) => a - b)
    .map((i) => sectionContentMarkdown(editor, i, headings))
    .join("\n\n")
    .slice(0, cap);
}
