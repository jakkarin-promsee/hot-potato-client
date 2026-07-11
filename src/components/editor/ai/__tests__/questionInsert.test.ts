import { describe, it, expect, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import type { GeneratedQuestion } from "@/lib/creatorApi";
import { DEFAULT_QUESTION_FEEDBACK_MODE } from "../../extensions/questionMode";
import {
  generatedQuestionToNode,
  insertGeneratedQuestions,
  resolveInsertPos,
} from "../questionInsert";

function fakeEditor(opts: { focused?: boolean; afterPos?: number } = {}) {
  const chain = {
    focus: vi.fn().mockReturnThis(),
    insertContentAt: vi.fn().mockReturnThis(),
    run: vi.fn(),
  };
  const editor = {
    isFocused: opts.focused ?? false,
    state: {
      doc: { content: { size: 40 } },
      selection: { $to: { after: () => opts.afterPos ?? 7 } },
    },
    chain: () => chain,
  } as unknown as Editor;
  return { editor, chain };
}

describe("generatedQuestionToNode", () => {
  it("maps choice with answerType single + default feedbackMode + fresh id", () => {
    const node = generatedQuestionToNode({
      type: "choice",
      question: "ข้อไหนถูก?",
      choices: [
        { text: "ก", correct: true },
        { text: "ข", correct: false },
        { text: "ค", correct: false },
      ],
    });
    expect(node.type).toBe("QuestionChoice");
    expect(node.attrs.question).toBe("ข้อไหนถูก?");
    expect(node.attrs.answerType).toBe("single");
    expect(node.attrs.feedbackMode).toBe(DEFAULT_QUESTION_FEEDBACK_MODE);
    expect(typeof node.attrs.id).toBe("string");
    expect((node.attrs.id as string).length).toBeGreaterThan(10);
  });

  it("maps write guideAnswer → attr `answer`", () => {
    const node = generatedQuestionToNode({
      type: "write",
      question: "อธิบายหน่อย",
      guideAnswer: "แนวเฉลยจาก AI",
    });
    expect(node.type).toBe("QuestionWrite");
    expect(node.attrs.answer).toBe("แนวเฉลยจาก AI");
    expect(node.attrs).not.toHaveProperty("guideAnswer");
  });

  it("passes blank templates through untouched ([Q-n] intact)", () => {
    const blankChoice = generatedQuestionToNode({
      type: "blank_choice",
      template: "พืชใช้ [Q-1] และ [Q-2]",
      choices: ["น้ำ", "แสง"],
      correctByBlank: [0, 1],
    });
    expect(blankChoice.type).toBe("QuestionBlankChoice");
    expect(blankChoice.attrs.template).toBe("พืชใช้ [Q-1] และ [Q-2]");
    expect(blankChoice.attrs.correctByBlank).toEqual([0, 1]);

    const blankWrite = generatedQuestionToNode({
      type: "blank_write",
      template: "ผลผลิตคือ [Q-1]",
      blankAnswers: ["กลูโคส"],
    });
    expect(blankWrite.type).toBe("QuestionBlankWrite");
    expect(blankWrite.attrs.blankAnswers).toEqual(["กลูโคส"]);
  });

  it("gives every block a unique id", () => {
    const q: GeneratedQuestion = {
      type: "write",
      question: "x",
      guideAnswer: "y",
    };
    expect(generatedQuestionToNode(q).attrs.id).not.toBe(
      generatedQuestionToNode(q).attrs.id,
    );
  });
});

describe("resolveInsertPos", () => {
  it("uses end of doc when the editor is not focused (dialog holds focus)", () => {
    const { editor } = fakeEditor({ focused: false });
    expect(resolveInsertPos(editor)).toBe(40);
  });

  it("uses the block boundary after the selection when focused", () => {
    const { editor } = fakeEditor({ focused: true, afterPos: 7 });
    expect(resolveInsertPos(editor)).toBe(7);
  });
});

describe("insertGeneratedQuestions", () => {
  it("inserts each block followed by a trailing paragraph", () => {
    const { editor, chain } = fakeEditor();
    insertGeneratedQuestions(editor, [
      { type: "write", question: "q1", guideAnswer: "a1" },
      {
        type: "choice",
        question: "q2",
        choices: [
          { text: "ก", correct: true },
          { text: "ข", correct: false },
          { text: "ค", correct: false },
        ],
      },
    ]);
    expect(chain.insertContentAt).toHaveBeenCalledTimes(1);
    const [pos, content] = chain.insertContentAt.mock.calls[0];
    expect(pos).toBe(40);
    expect(content).toHaveLength(4);
    expect(content[0].type).toBe("QuestionWrite");
    expect(content[1]).toEqual({ type: "paragraph" });
    expect(content[2].type).toBe("QuestionChoice");
    expect(content[3]).toEqual({ type: "paragraph" });
    expect(chain.run).toHaveBeenCalled();
  });

  it("does nothing for an empty list", () => {
    const { editor, chain } = fakeEditor();
    insertGeneratedQuestions(editor, []);
    expect(chain.insertContentAt).not.toHaveBeenCalled();
  });
});
