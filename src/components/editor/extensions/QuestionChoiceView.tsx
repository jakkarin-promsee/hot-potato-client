import { useState, useCallback, useEffect, useRef } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { useAnswerStore } from "@/stores/content-answer.store";
import FeedbackDiscussionPanel, {
  type FeedbackThreadMessage,
} from "./FeedbackDiscussionPanel";
import QuestionFeedbackModeToggle from "./QuestionFeedbackModeToggle";
import type { QuestionFeedbackMode } from "./questionMode";
import BlockMoveControls from "./BlockMoveControls";
import {
  requestFeedbackFollowup,
  requestQuestionFeedback,
} from "./questionFeedbackApi";
import { evaluateChoiceAnswer } from "./questionEvaluation";

import {
  Minus,
  Plus,
  HelpCircle,
  SquareDashedMousePointer,
  Eye,
  EyeOff,
  Check,
  X,
  Layers,
  CircleDot,
} from "lucide-react";
import { useEditorI18n } from "../editor.i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Choice {
  text: string;
  correct: boolean;
}

export interface QuestionChoiceAttrs {
  question: string;
  choices: Choice[];
  answerType: "single" | "multi";
  feedbackMode: QuestionFeedbackMode;
}

// ─── Auto-grow hook ───────────────────────────────────────────────────────────

function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(resize, [value, resize]);

  useEffect(() => {
    const raf = requestAnimationFrame(resize);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return ref;
}

// ─── Choice Input (Creator) ───────────────────────────────────────────────────
// Extracted so useAutoGrow is always called at the top level, never in a .map()

interface ChoiceInputProps {
  choice: Choice;
  answerType: "single" | "multi";
  onChange: (text: string) => void;
  onToggleCorrect: () => void;
  onBlur: () => void;
  onRemove?: () => void;
}

function ChoiceInput({
  choice,
  answerType,
  onChange,
  onToggleCorrect,
  onBlur,
  onRemove,
}: ChoiceInputProps) {
  const { t } = useEditorI18n();
  const ref = useAutoGrow(choice.text);

  return (
    <div className="flex items-start gap-2">
      {/* Answer toggle — round for single, square for multi */}
      <button
        type="button"
        onClick={onToggleCorrect}
        aria-label={
          choice.correct
            ? t("Mark as incorrect", "ทำเครื่องหมายว่าไม่ถูก")
            : t("Mark as correct", "ทำเครื่องหมายว่าถูก")
        }
        className={[
          "mt-2 flex h-4 w-4 shrink-0 items-center justify-center border-2 transition",
          answerType === "single" ? "rounded-full" : "rounded",
          choice.correct
            ? "border-green-500 bg-green-500 text-white"
            : "border-gray-300 bg-white hover:border-green-400",
        ].join(" ")}
      >
        {choice.correct && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      </button>

      <textarea
        ref={ref}
        rows={1}
        value={choice.text}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="flex-1 resize-none overflow-hidden rounded-md border border-gray-200 bg-white px-3 py-1.5 text-base text-gray-800 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
      />

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500"
          aria-label={t("Remove choice", "ลบตัวเลือก")}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Creator Mode ─────────────────────────────────────────────────────────────

interface CreatorViewProps {
  initialQuestion: string;
  initialChoices: Choice[];
  initialAnswerType: "single" | "multi";
  initialFeedbackMode: QuestionFeedbackMode;
  onFlush: (
    question: string,
    choices: Choice[],
    answerType: "single" | "multi",
    feedbackMode: QuestionFeedbackMode,
  ) => void;
  onCommit: (
    question: string,
    choices: Choice[],
    answerType: "single" | "multi",
    feedbackMode: QuestionFeedbackMode,
  ) => void;
}

function CreatorView({
  initialQuestion,
  initialChoices,
  initialAnswerType,
  initialFeedbackMode,
  onFlush,
  onCommit,
}: CreatorViewProps) {
  const { t } = useEditorI18n();
  const [question, setQuestion] = useState(initialQuestion);
  const [choices, setChoices] = useState(initialChoices);
  const [answerType, setAnswerType] = useState(initialAnswerType);
  const [feedbackMode, setFeedbackMode] =
    useState<QuestionFeedbackMode>(initialFeedbackMode);
  const questionRef = useAutoGrow(question);

  // Re-sync on undo/redo
  useEffect(() => {
    setQuestion(initialQuestion);
  }, [initialQuestion]);
  useEffect(() => {
    setChoices(initialChoices);
  }, [initialChoices]);
  useEffect(() => {
    setAnswerType(initialAnswerType);
  }, [initialAnswerType]);
  useEffect(() => {
    setFeedbackMode(initialFeedbackMode);
  }, [initialFeedbackMode]);

  const flush = () => onFlush(question, choices, answerType, feedbackMode);

  const handleToggleAnswerType = () => {
    const next = answerType === "single" ? "multi" : "single";
    // When switching back to single, keep only the first correct answer
    const nextChoices =
      next === "single"
        ? (() => {
            let found = false;
            return choices.map((c) => {
              if (c.correct && !found) {
                found = true;
                return c;
              }
              return { ...c, correct: false };
            });
          })()
        : choices;
    setAnswerType(next);
    setChoices(nextChoices);
    onCommit(question, nextChoices, next, feedbackMode);
  };

  const handleToggleCorrect = (index: number) => {
    const next =
      answerType === "single"
        ? choices.map((c, i) => ({ ...c, correct: i === index }))
        : choices.map((c, i) =>
            i === index ? { ...c, correct: !c.correct } : c,
          );
    setChoices(next);
    onCommit(question, next, answerType, feedbackMode);
  };

  const handleAddChoice = () => {
    const next = [
      ...choices,
      { text: `Option ${choices.length + 1}`, correct: false },
    ];
    setChoices(next);
    onCommit(question, next, answerType, feedbackMode);
  };

  const handleRemoveChoice = (index: number) => {
    const next = choices.filter((_, i) => i !== index);
    setChoices(next);
    onCommit(question, next, answerType, feedbackMode);
  };

  return (
    <div
      className="flex flex-col gap-3"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <QuestionFeedbackModeToggle
        mode={feedbackMode}
        onChange={(nextMode) => {
          setFeedbackMode(nextMode);
          onCommit(question, choices, answerType, nextMode);
        }}
      />

      {/* Answer type toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">{t("Answer type:", "ประเภทคำตอบ:")}</span>
        <button
          type="button"
          onClick={handleToggleAnswerType}
          className={[
            "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition",
            answerType === "multi"
              ? "border-violet-300 bg-violet-50 text-violet-700"
              : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
          ].join(" ")}
        >
          {answerType === "single" ? (
            <>
              <CircleDot className="h-3 w-3" /> {t("Single correct", "คำตอบเดียว")}
            </>
          ) : (
            <>
              <Layers className="h-3 w-3" /> {t("Multiple correct", "หลายคำตอบ")}
            </>
          )}
        </button>
      </div>

      {/* Question input */}
      <textarea
        ref={questionRef}
        rows={1}
        value={question}
        placeholder={t("Type your question here…", "พิมพ์คำถามของคุณที่นี่…")}
        onChange={(e) => setQuestion(e.target.value)}
        onBlur={flush}
        className="w-full resize-none overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-2 text-base font-medium text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
      />

      {/* Choice list */}
      <div className="flex flex-col gap-2">
        {choices.map((choice, i) => (
          <ChoiceInput
            key={i}
            choice={choice}
            answerType={answerType}
            onChange={(text) => {
              const next = choices.map((c, ci) =>
                ci === i ? { ...c, text } : c,
              );
              setChoices(next);
            }}
            onToggleCorrect={() => handleToggleCorrect(i)}
            onBlur={flush}
            onRemove={
              choices.length > 1 ? () => handleRemoveChoice(i) : undefined
            }
          />
        ))}
      </div>

      {/* Add choice */}
      <button
        type="button"
        onClick={handleAddChoice}
        className="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-violet-300 px-3 py-1.5 text-xs font-medium text-violet-600 transition hover:border-violet-400 hover:bg-violet-50"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("Add choice", "เพิ่มตัวเลือก")}
      </button>
    </div>
  );
}

// ─── Viewer Mode ──────────────────────────────────────────────────────────────

interface ViewerViewProps {
  attrs: QuestionChoiceAttrs;
}

// Each block answer shape
interface BlockAnswer {
  selected: number[]; // chosen indices
  submitted: boolean; // has user submitted?
  aiFeedback?: string;
  feedbackThread?: FeedbackThreadMessage[];
  threadOpen?: boolean;
}

function ViewerView({ attrs }: ViewerViewProps) {
  const { t } = useEditorI18n();
  const { question, choices, answerType, feedbackMode } = attrs;
  const blockId = (attrs as any).id as string;

  // ── Store ──────────────────────────────────────────────────────
  const answers = useAnswerStore((s) => s.answers);
  const setAnswer = useAnswerStore((s) => s.setAnswer);

  // Restore from store or default
  const savedAnswer = answers[blockId] as BlockAnswer | undefined;
  const [selectedIndices, setSelectedIndices] = useState<number[]>(
    savedAnswer?.selected ?? [],
  );
  const [submitted, setSubmitted] = useState<boolean>(
    savedAnswer?.submitted ?? false,
  );
  const [aiFeedback, setAiFeedback] = useState<string>(
    savedAnswer?.aiFeedback ?? "",
  );
  const [feedbackThread, setFeedbackThread] = useState<FeedbackThreadMessage[]>(
    savedAnswer?.feedbackThread ?? [],
  );
  const [threadOpen, setThreadOpen] = useState(savedAnswer?.threadOpen ?? false);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  const persistAnswer = useCallback(
    (next: Partial<BlockAnswer>) => {
      setAnswer(blockId, {
        selected: selectedIndices,
        submitted,
        aiFeedback,
        feedbackThread,
        threadOpen,
        ...next,
      });
    },
    [
      aiFeedback,
      blockId,
      feedbackThread,
      selectedIndices,
      setAnswer,
      submitted,
      threadOpen,
    ],
  );

  // ── Sync from store on load (when answers load after component mounts) ──
  useEffect(() => {
    if (savedAnswer) {
      setSelectedIndices(savedAnswer.selected ?? []);
      setSubmitted(savedAnswer.submitted ?? false);
      setAiFeedback(savedAnswer.aiFeedback ?? "");
      setFeedbackThread(savedAnswer.feedbackThread ?? []);
      setThreadOpen(savedAnswer.threadOpen ?? false);
    }
  }, [answers[blockId]]); // re-sync when this block's answer changes

  // ── Helpers ────────────────────────────────────────────────────
  const isSelected = (i: number) => selectedIndices.includes(i);
  const hasSelection = selectedIndices.length > 0;

  const handleSelect = (i: number) => {
    if (submitted) return;

    const next =
      answerType === "single"
        ? [i]
        : isSelected(i)
          ? selectedIndices.filter((s) => s !== i)
          : [...selectedIndices, i];

    setSelectedIndices(next);

    // Save selection instantly (not submitted yet)
    setFeedbackThread([]);
    setThreadOpen(false);
    persistAnswer({
      selected: next,
      submitted: false,
      aiFeedback: "",
      feedbackThread: [],
      threadOpen: false,
    });
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    setAiFeedback("");
    setFeedbackThread([]);
    setThreadOpen(false);
    // Save with submitted: true — this triggers 30s sync to DB
    persistAnswer({
      selected: selectedIndices,
      submitted: true,
      aiFeedback: "",
      feedbackThread: [],
      threadOpen: false,
    });

    setIsFeedbackLoading(true);
    try {
      const {
        accuracyPercent,
        evaluationLevel,
        missedCorrect,
        wrongSelected,
        correctAnswer,
        userAnswer,
      } = evaluateChoiceAnswer(choices, selectedIndices);

      const feedback = await requestQuestionFeedback({
        question: question || "Choice question",
        correctAnswer,
        userAnswer,
        evaluationLevel,
        accuracyPercent,
        diagnostics: `missedCorrect=${missedCorrect || "(none)"}; wrongSelected=${wrongSelected || "(none)"}`,
        feedbackMode,
      });
      setAiFeedback(feedback);
      persistAnswer({
        selected: selectedIndices,
        submitted: true,
        aiFeedback: feedback,
        feedbackThread: [],
        threadOpen: false,
      });
    } finally {
      setIsFeedbackLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedIndices([]);
    setSubmitted(false);
    setAiFeedback("");
    setFeedbackThread([]);
    setThreadOpen(false);
    persistAnswer({
      selected: [],
      submitted: false,
      aiFeedback: "",
      feedbackThread: [],
      threadOpen: false,
    });
  };

  const isFullyCorrect =
    submitted && choices.every((c, i) => c.correct === isSelected(i));

  const handleSendThreadMessage = useCallback(
    async (message: string) => {
      if (!aiFeedback.trim()) return;
      const studentMessage: FeedbackThreadMessage = {
        role: "student",
        text: message,
        createdAt: new Date().toISOString(),
      };
      const threadWithStudent = [...feedbackThread, studentMessage];
      setFeedbackThread(threadWithStudent);
      persistAnswer({ feedbackThread: threadWithStudent, threadOpen: true });

      const correctAnswer = choices
        .filter((choice) => choice.correct)
        .map((choice) => choice.text.trim())
        .filter(Boolean)
        .join(" | ");
      const userAnswer = selectedIndices
        .map((idx) => choices[idx]?.text?.trim() ?? "")
        .filter(Boolean)
        .join(" | ");

      setIsThreadLoading(true);
      try {
        const aiReply = await requestFeedbackFollowup({
          topic: question || "Choice question",
          studentAnswer: userAnswer,
          initialFeedback: aiFeedback,
          followupQuestion: message,
          expectedAnswer: correctAnswer,
          feedbackMode,
          thread: threadWithStudent.map((entry) => ({
            role: entry.role,
            text: entry.text,
          })),
        });
        const aiMessage: FeedbackThreadMessage = {
          role: "ai",
          text: aiReply,
          createdAt: new Date().toISOString(),
        };
        const nextThread = [...threadWithStudent, aiMessage];
        setFeedbackThread(nextThread);
        persistAnswer({ feedbackThread: nextThread, threadOpen: true });
      } finally {
        setIsThreadLoading(false);
      }
    },
    [
      aiFeedback,
      choices,
      feedbackMode,
      feedbackThread,
      persistAnswer,
      question,
      selectedIndices,
    ],
  );

  // ── Rest of your existing JSX — just replace state references ──
  return (
    <div className="flex flex-col gap-3">
      {/* Question */}
      <p className="text-base font-semibold text-gray-900">
        {question || (
          <span className="italic text-gray-400">{t("No question set", "ยังไม่ได้ตั้งคำถาม")}</span>
        )}
      </p>

      {/* Hint */}
      {!submitted && (
        <p className="text-xs text-gray-400">
          {answerType === "multi"
            ? t("Select all that apply.", "เลือกทุกข้อที่ถูกต้อง")
            : t("Select one answer.", "เลือกหนึ่งคำตอบ")}
        </p>
      )}

      {/* Choices — same as your existing JSX, uses isSelected() */}
      <div className="flex flex-col gap-2">
        {choices.map((choice, i) => {
          const sel = isSelected(i);
          const isCorrectChoice = choice.correct;

          const rowStyle = submitted
            ? sel && isCorrectChoice
              ? "border-green-400 bg-green-50 text-green-900"
              : sel && !isCorrectChoice
                ? "border-red-400 bg-red-50 text-red-900"
                : isCorrectChoice
                  ? "border-green-300 bg-green-50 text-green-800"
                  : "border-gray-200 bg-white text-gray-400"
            : sel
              ? "border-violet-400 bg-violet-50 text-violet-900"
              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50";

          const indicatorStyle = submitted
            ? sel && isCorrectChoice
              ? "border-green-500 bg-green-500 text-white"
              : sel && !isCorrectChoice
                ? "border-red-500 bg-red-500 text-white"
                : isCorrectChoice
                  ? "border-green-400 bg-green-100 text-green-600"
                  : "border-gray-200"
            : sel
              ? "border-violet-500 bg-violet-500 text-white"
              : "border-gray-300";

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(i)}
              disabled={submitted}
              className={[
                "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-base transition",
                rowStyle,
                submitted ? "cursor-default" : "cursor-pointer",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-4 w-4 shrink-0 items-center justify-center border-2 transition",
                  answerType === "single" ? "rounded-full" : "rounded",
                  indicatorStyle,
                ].join(" ")}
              >
                {submitted ? (
                  (sel && isCorrectChoice) || (!sel && isCorrectChoice) ? (
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  ) : sel && !isCorrectChoice ? (
                    <X className="h-2.5 w-2.5" strokeWidth={3} />
                  ) : null
                ) : sel ? (
                  answerType === "single" ? (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  ) : (
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  )
                ) : null}
              </span>

              {choice.text}

              {submitted && (
                <span className="ml-auto text-xs font-medium">
                  {sel && isCorrectChoice && (
                    <span className="text-green-600">{t("Correct ✓", "ถูก ✓")}</span>
                  )}
                  {sel && !isCorrectChoice && (
                    <span className="text-red-500">{t("Wrong ✗", "ผิด ✗")}</span>
                  )}
                  {!sel && isCorrectChoice && (
                    <span className="text-green-500">{t("Correct answer", "คำตอบที่ถูก")}</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Submit / result row */}
      <div className="flex items-center gap-3">
        {!submitted ? (
          <button
            type="button"
            onClick={() => void handleSubmit()} // 👈 updated
            disabled={!hasSelection}
            className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("Submit", "ส่ง")}
          </button>
        ) : (
          <>
            <span
              className={[
                "text-sm font-semibold",
                isFullyCorrect ? "text-green-600" : "text-red-500",
              ].join(" ")}
            >
              {isFullyCorrect
                ? t("🎉 All correct!", "🎉 ถูกทั้งหมด!")
                : t("Not quite — review the answers above.", "ยังไม่ถูกทั้งหมด — ลองดูคำตอบด้านบนอีกครั้ง")}
            </span>
            <button
              type="button"
              onClick={handleReset} // 👈 also resets store
              className="ml-auto text-sm text-gray-400 underline transition hover:text-gray-600"
            >
              {t("Try again", "ลองใหม่")}
            </button>
          </>
        )}
      </div>
      {submitted && (
        <div className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-500">
            {t("AI feedback", "คำแนะนำจาก AI")}
          </p>
          <p className="mt-1 text-base text-violet-900">
            {isFeedbackLoading
              ? t("AI is generating detailed feedback...", "AI กำลังเขียนคำแนะนำแบบละเอียดให้...")
              : aiFeedback || t("No feedback yet", "ยังไม่มีคำแนะนำ")}
          </p>
        </div>
      )}
      {submitted && aiFeedback && (
        <FeedbackDiscussionPanel
          messages={feedbackThread}
          open={threadOpen}
          loading={isThreadLoading}
          onToggle={() => {
            const next = !threadOpen;
            setThreadOpen(next);
            persistAnswer({ threadOpen: next });
          }}
          onSend={handleSendThreadMessage}
        />
      )}
    </div>
  );
}

// ─── Main NodeView Component ───────────────────────────────────────────────────

export default function QuestionChoiceView({
  node,
  selected,
  getPos,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const { t } = useEditorI18n();
  const isEditable = editor.isEditable;
  const attrs = node.attrs as QuestionChoiceAttrs;

  // Local preview toggle — lets the creator peek at the viewer without
  // switching the editor to read-only. Only available in editable mode.
  const [previewMode, setPreviewMode] = useState(false);

  const handleFlush = useCallback(
    (
      question: string,
      choices: Choice[],
      answerType: "single" | "multi",
      feedbackMode: QuestionFeedbackMode,
    ) => {
      updateAttributes({ question, choices, answerType, feedbackMode });
    },
    [updateAttributes],
  );

  const handleCommit = useCallback(
    (
      question: string,
      choices: Choice[],
      answerType: "single" | "multi",
      feedbackMode: QuestionFeedbackMode,
    ) => {
      updateAttributes({ question, choices, answerType, feedbackMode });
    },
    [updateAttributes],
  );

  const selectNode = useCallback(() => {
    if (typeof getPos !== "function") return;
    const pos = getPos();
    const nodeSelection = NodeSelection.create(editor.state.doc, pos as number);
    editor.view.dispatch(editor.state.tr.setSelection(nodeSelection));
    editor.view.focus();
  }, [getPos, editor]);

  return (
    <NodeViewWrapper className="text-base">
      <div
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) selectNode();
        }}
        className={`my-3 rounded-xl border bg-gray-50 p-4 ${
          selected ? "" : "border-accent-foreground shadow-md"
        }`}
      >
        {isEditable && (
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-100">
              <HelpCircle className="h-3 w-3 text-violet-600" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {previewMode
                ? t("Choice question — preview", "คำถามตัวเลือก — ตัวอย่าง")
                : t("Choice question — creator", "คำถามตัวเลือก — ผู้สร้าง")}
            </span>

            <div className="ml-auto flex items-center gap-1">
              <BlockMoveControls editor={editor} getPos={getPos} />

              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setPreviewMode((v) => !v)}
                className={[
                  "flex h-6 w-6 items-center justify-center rounded transition",
                  previewMode
                    ? "bg-violet-100 text-violet-600"
                    : "text-gray-300 hover:bg-violet-100 hover:text-violet-500",
                ].join(" ")}
                aria-label={
                  previewMode
                    ? t("Switch to creator", "สลับไปโหมดผู้สร้าง")
                    : t("Preview as viewer", "ดูตัวอย่างแบบผู้เรียน")
                }
              >
                {previewMode ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  selectNode();
                }}
                className="flex h-6 w-6 items-center justify-center rounded text-gray-300 transition hover:bg-violet-100 hover:text-violet-500"
                aria-label={t("Select block", "เลือกบล็อก")}
              >
                <SquareDashedMousePointer className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {isEditable && !previewMode ? (
          <CreatorView
            initialQuestion={attrs.question}
            initialChoices={attrs.choices}
            initialAnswerType={attrs.answerType}
            initialFeedbackMode={attrs.feedbackMode}
            onFlush={handleFlush}
            onCommit={handleCommit}
          />
        ) : (
          <ViewerView attrs={attrs} />
        )}
      </div>
    </NodeViewWrapper>
  );
}
