/**
 * Map AI-generated questions (creatorApi `GeneratedQuestion`) onto the real
 * TipTap question nodes. The attrs here must stay identical to what the
 * hand-made insert commands produce (`insertQuestionChoice()` etc.):
 * `id: crypto.randomUUID()`, `feedbackMode: DEFAULT_QUESTION_FEEDBACK_MODE`,
 * a trailing paragraph after each block, and `answerType: "single"` for
 * choice questions (v1 generates single-answer only).
 */
import type { Editor } from "@tiptap/react";
import type { GeneratedQuestion } from "@/lib/creatorApi";
import { DEFAULT_QUESTION_FEEDBACK_MODE } from "../extensions/questionMode";

export interface QuestionNodeJson {
  type: string;
  attrs: Record<string, unknown>;
}

export function generatedQuestionToNode(q: GeneratedQuestion): QuestionNodeJson {
  const base = {
    id: crypto.randomUUID(),
    feedbackMode: DEFAULT_QUESTION_FEEDBACK_MODE,
  };
  switch (q.type) {
    case "choice":
      return {
        type: "QuestionChoice",
        attrs: {
          ...base,
          question: q.question,
          choices: q.choices,
          answerType: "single",
        },
      };
    case "write":
      return {
        type: "QuestionWrite",
        // The teacher guide answer lives in the node attr `answer`
        attrs: { ...base, question: q.question, answer: q.guideAnswer },
      };
    case "blank_choice":
      return {
        type: "QuestionBlankChoice",
        attrs: {
          ...base,
          template: q.template,
          choices: q.choices,
          correctByBlank: q.correctByBlank,
        },
      };
    case "blank_write":
      return {
        type: "QuestionBlankWrite",
        attrs: { ...base, template: q.template, blankAnswers: q.blankAnswers },
      };
  }
}

/**
 * Position captured when a question dialog opens — the modal steals focus, so
 * callers must snapshot the caret once up front and pass it to every insert.
 */
export function captureQuestionInsertPos(editor: Editor): number {
  const { $from } = editor.state.selection;
  try {
    return $from.after(1);
  } catch {
    return editor.state.doc.content.size;
  }
}

/**
 * Block boundary after the current selection when the editor is focused,
 * else the end of the document (the dialog usually holds focus, so end-of-doc
 * is the common, predictable case).
 */
export function resolveInsertPos(editor: Editor): number {
  if (editor.isFocused) {
    try {
      return editor.state.selection.$to.after(1);
    } catch {
      // selection at an edge case position — fall through to end of doc
    }
  }
  return editor.state.doc.content.size;
}

export function insertGeneratedQuestions(
  editor: Editor,
  questions: GeneratedQuestion[],
  insertPos?: number,
): void {
  if (!questions.length) return;
  const content = questions.flatMap((q) => [
    generatedQuestionToNode(q),
    { type: "paragraph" },
  ]);
  const pos = insertPos ?? resolveInsertPos(editor);
  editor.chain().focus().insertContentAt(pos, content).run();
}
