/**
 * Selection helpers for the AI writing assistant (Tier 3.5.D).
 *
 * Selection → text is plain-text v1 (`doc.textBetween`) — replacing formatted
 * text re-creates structure from the AI's markdown instead of preserving
 * inline marks (the preview dialog says so). Markdown → nodes goes through
 * tiptap-markdown's `insertContentAt` override (string content is parsed as
 * markdown), which is the one true insertion path for AI prose.
 */
import type { Editor } from "@tiptap/react";
import type { ProofreadPreset } from "@/lib/creatorApi";

export interface SelectionSnapshot {
  from: number;
  to: number;
  text: string;
}

export function getSelectionSnapshot(editor: Editor): SelectionSnapshot | null {
  const { from, to, empty } = editor.state.selection;
  if (empty) return null;
  const text = editor.state.doc.textBetween(from, to, "\n\n");
  if (!text.trim()) return null;
  return { from, to, text };
}

/** Replace the captured range with AI markdown (parsed to nodes). */
export function replaceRangeWithMarkdown(
  editor: Editor,
  range: { from: number; to: number },
  markdown: string,
): void {
  editor
    .chain()
    .focus()
    .insertContentAt({ from: range.from, to: range.to }, markdown)
    .run();
}

export interface WritingAction {
  preset: ProofreadPreset;
  labelEn: string;
  labelTh: string;
  needsGradeLevel?: boolean;
}

export const WRITING_ACTIONS: WritingAction[] = [
  { preset: "proofread", labelEn: "Fix typos", labelTh: "แก้คำผิด" },
  { preset: "format", labelEn: "Format & headings", labelTh: "จัดย่อหน้า/หัวข้อ" },
  { preset: "simplify", labelEn: "Make it easier to read", labelTh: "เกลาให้อ่านง่าย" },
  { preset: "shorten", labelEn: "Shorten", labelTh: "ย่อให้กระชับ" },
  { preset: "expand", labelEn: "Expand with examples", labelTh: "ขยายความ + ตัวอย่าง" },
  {
    preset: "reading_level",
    labelEn: "Adjust to grade level",
    labelTh: "ปรับระดับชั้น",
    needsGradeLevel: true,
  },
];

export const GRADE_LEVELS = [
  "ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6",
  "ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6",
];
