import { useState, useCallback, useEffect, useMemo } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { useAnswerStore } from "@/stores/content-answer.store";
import { useCanvasStore } from "@/stores/canvas.store";
import FeedbackDiscussionPanel, {
  type FeedbackThreadMessage,
} from "./FeedbackDiscussionPanel";
import QuestionFeedbackModeToggle from "./QuestionFeedbackModeToggle";
import { useColdStartHint } from "@/hooks/useColdStartHint";
import {
  AiUnavailableError,
  callTutorStream,
  feedbackThreadToClientThread,
} from "./tutorApi";
import AiErrorRetry from "./AiErrorRetry";
import MarkdownMessage from "./MarkdownMessage";
import SuggestionChips from "./SuggestionChips";
import type { QuestionFeedbackMode } from "./questionMode";
import { Eye, EyeOff, HelpCircle, X } from "lucide-react";
import type { QuestionBlankChoiceAttrs } from "./QuestionBlankChoiceNode";
import BlockMoveControls from "./BlockMoveControls";
import BlockDeleteButton from "./BlockDeleteButton";
import { useAutoGrow } from "./useAutoGrow";
import { useEditorI18n } from "../editor.i18n";

interface BlockAnswer {
  placedByBlank: Array<number | null>;
  submitted: boolean;
  aiFeedback?: string;
  feedbackThread?: FeedbackThreadMessage[];
  threadOpen?: boolean;
  suggestions?: string[];
}

const BLANK_TOKEN_REGEX = /\[Q-(\d+)\]|\{\{(\d+)\}\}/g;

const getBlankIndices = (template: string): number[] => {
  const unique = new Set<number>();
  let match: RegExpExecArray | null = null;
  while ((match = BLANK_TOKEN_REGEX.exec(template)) !== null) {
    unique.add(Number(match[1] ?? match[2]));
  }
  return [...unique].sort((a, b) => a - b);
};

const renderTemplatePieces = (template: string) => {
  const pieces: Array<{ text?: string; blank?: number }> = [];
  let last = 0;
  let match: RegExpExecArray | null = null;
  while ((match = BLANK_TOKEN_REGEX.exec(template)) !== null) {
    if (match.index > last) {
      pieces.push({ text: template.slice(last, match.index) });
    }
    pieces.push({ blank: Number(match[1] ?? match[2]) });
    last = BLANK_TOKEN_REGEX.lastIndex;
  }
  if (last < template.length) {
    pieces.push({ text: template.slice(last) });
  }
  return pieces;
};

const remapCorrectByBlank = (
  prevTemplate: string,
  prevCorrectByBlank: number[],
  nextTemplate: string,
) => {
  const prevIndices = getBlankIndices(prevTemplate);
  const nextIndices = getBlankIndices(nextTemplate);
  const byToken = new Map<number, number>();
  prevIndices.forEach((tokenIdx, i) => {
    byToken.set(tokenIdx, prevCorrectByBlank[i] ?? -1);
  });
  return nextIndices.map((tokenIdx) => byToken.get(tokenIdx) ?? -1);
};

interface CreatorViewProps {
  initialTemplate: string;
  initialChoices: string[];
  initialCorrectByBlank: number[];
  initialFeedbackMode: QuestionFeedbackMode;
  onFlush: (
    template: string,
    choices: string[],
    correctByBlank: number[],
    feedbackMode: QuestionFeedbackMode,
  ) => void;
}

function CreatorView({
  initialTemplate,
  initialChoices,
  initialCorrectByBlank,
  initialFeedbackMode,
  onFlush,
}: CreatorViewProps) {
  const { t } = useEditorI18n();
  const [template, setTemplate] = useState(initialTemplate);
  const [choices, setChoices] = useState(initialChoices);
  const [correctByBlank, setCorrectByBlank] = useState(initialCorrectByBlank);
  const [feedbackMode, setFeedbackMode] = useState<QuestionFeedbackMode>(
    initialFeedbackMode,
  );
  const templateRef = useAutoGrow(template);

  useEffect(() => setTemplate(initialTemplate), [initialTemplate]);
  useEffect(() => setChoices(initialChoices), [initialChoices]);
  useEffect(() => setCorrectByBlank(initialCorrectByBlank), [initialCorrectByBlank]);
  useEffect(() => setFeedbackMode(initialFeedbackMode), [initialFeedbackMode]);

  const blankIndices = useMemo(() => getBlankIndices(template), [template]);
  const previewPieces = useMemo(() => renderTemplatePieces(template), [template]);

  const flush = useCallback(
    (nextTemplate: string, nextChoices: string[], nextCorrect: number[]) => {
      const safeCorrect = remapCorrectByBlank(template, nextCorrect, nextTemplate).map(
        (v) => (v >= 0 && v < nextChoices.length ? v : -1),
      );
      onFlush(nextTemplate, nextChoices, safeCorrect, feedbackMode);
    },
    [feedbackMode, onFlush, template],
  );

  const insertTokenAtCursor = (token: string) => {
    const el = templateRef.current;
    const start = el?.selectionStart ?? template.length;
    const end = el?.selectionEnd ?? template.length;
    const nextTemplate = `${template.slice(0, start)}${token}${template.slice(end)}`;
    const nextCorrect = remapCorrectByBlank(template, correctByBlank, nextTemplate);
    setTemplate(nextTemplate);
    setCorrectByBlank(nextCorrect);
  };

  const addBlank = () => {
    const max = blankIndices.length ? Math.max(...blankIndices) : -1;
    insertTokenAtCursor(`[Q-${max + 1}]`);
  };

  const addChoice = () => {
    setChoices((prev) => [...prev, `Choice ${prev.length + 1}`]);
  };

  const removeChoice = (choiceIdx: number) => {
    const nextChoices = choices.filter((_, i) => i !== choiceIdx);
    const nextCorrect = correctByBlank.map((c) =>
      c === choiceIdx ? -1 : c > choiceIdx ? c - 1 : c,
    );
    setChoices(nextChoices);
    setCorrectByBlank(nextCorrect);
    onFlush(template, nextChoices, nextCorrect, feedbackMode);
  };

  return (
    <div className="flex flex-col gap-3" onMouseDown={(e) => e.stopPropagation()}>
      <QuestionFeedbackModeToggle
        mode={feedbackMode}
        onChange={(nextMode) => {
          setFeedbackMode(nextMode);
          onFlush(template, choices, correctByBlank, nextMode);
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addBlank}
          className="rounded-md border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-100"
        >
          {t("Add blank", "เพิ่มช่องว่าง")}
        </button>
        <span className="text-[11px] text-gray-400">
          {t(
            "Use [Q-0], [Q-1], ... automatically.",
            "ใช้ [Q-0], [Q-1], ... อัตโนมัติ",
          )}
        </span>
      </div>

      <textarea
        ref={templateRef}
        rows={2}
        value={template}
        placeholder={t("Type sentence and insert blanks.", "พิมพ์ประโยคและแทรกช่องว่าง")}
        onChange={(e) => {
          const nextTemplate = e.target.value;
          const nextCorrect = remapCorrectByBlank(template, correctByBlank, nextTemplate);
          setTemplate(nextTemplate);
          setCorrectByBlank(nextCorrect);
        }}
        onBlur={() => flush(template, choices, correctByBlank)}
        className="w-full resize-none overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
      />

      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {t("Preview", "ตัวอย่าง")}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-base text-gray-900">
          {previewPieces.map((piece, idx) =>
            piece.text !== undefined ? (
              <span key={`t-${idx}`} className="whitespace-pre-wrap">
                {piece.text}
              </span>
            ) : (
              <span
                key={`b-${idx}`}
                className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700"
              >
                [Q-{piece.blank}]
              </span>
            ),
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {t("Choice bank", "คลังตัวเลือก")}
        </p>
        <button
          type="button"
          onClick={addChoice}
          className="rounded-md border border-dashed border-violet-300 px-2 py-1 text-xs font-semibold text-violet-600 hover:bg-violet-50"
        >
          {t("Add choice", "เพิ่มตัวเลือก")}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {choices.map((choice, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={choice}
              onChange={(e) => {
                const next = [...choices];
                next[i] = e.target.value;
                setChoices(next);
              }}
              onBlur={() => flush(template, choices, correctByBlank)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-800 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
            {choices.length > 1 && (
              <button
                type="button"
                onClick={() => removeChoice(i)}
                className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50"
              >
                {t("Remove", "ลบ")}
              </button>
            )}
          </div>
        ))}
      </div>

      {blankIndices.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t("Correct answer mapping", "การจับคู่คำตอบที่ถูกต้อง")}
          </p>
          {blankIndices.map((blankTokenIdx, pos) => (
            <label key={blankTokenIdx} className="flex items-center gap-2 text-base">
              <span className="w-20 text-gray-600">[Q-{blankTokenIdx}]</span>
              <select
                value={correctByBlank[pos] ?? -1}
                onChange={(e) => {
                  const next = [...correctByBlank];
                  next[pos] = Number(e.target.value);
                  setCorrectByBlank(next);
                  onFlush(template, choices, next, feedbackMode);
                }}
                className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-base text-gray-800 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              >
                <option value={-1}>{t("Select choice", "เลือกตัวเลือก")}</option>
                {choices.map((c, i) => (
                  <option key={`${i}-${c}`} value={i}>
                    {c || t(`Choice ${i + 1}`, `ตัวเลือก ${i + 1}`)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function ViewerView({ attrs }: { attrs: QuestionBlankChoiceAttrs }) {
  const { t } = useEditorI18n();
  const { id: blockId, template, choices, correctByBlank, feedbackMode } = attrs;
  const answers = useAnswerStore((s) => s.answers);
  const setAnswer = useAnswerStore((s) => s.setAnswer);
  const contentId = useCanvasStore((s) => s.contentId);

  const blankIndices = useMemo(() => getBlankIndices(template), [template]);
  const pieces = useMemo(() => renderTemplatePieces(template), [template]);
  const tokenToPos = useMemo(() => {
    const map = new Map<number, number>();
    blankIndices.forEach((token, i) => map.set(token, i));
    return map;
  }, [blankIndices]);

  const saved = answers[blockId] as BlockAnswer | undefined;
  const [placedByBlank, setPlacedByBlank] = useState<Array<number | null>>(
    saved?.placedByBlank ?? blankIndices.map(() => null),
  );
  const [submitted, setSubmitted] = useState<boolean>(saved?.submitted ?? false);
  const [aiFeedback, setAiFeedback] = useState<string>(saved?.aiFeedback ?? "");
  const [feedbackThread, setFeedbackThread] = useState<FeedbackThreadMessage[]>(
    saved?.feedbackThread ?? [],
  );
  const [threadOpen, setThreadOpen] = useState(saved?.threadOpen ?? false);
  const [suggestions, setSuggestions] = useState<string[]>(
    saved?.suggestions ?? [],
  );
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [feedbackStreamingText, setFeedbackStreamingText] = useState("");
  const [threadStreamingText, setThreadStreamingText] = useState("");
  const showFeedbackColdStart = useColdStartHint(
    isFeedbackLoading && !feedbackStreamingText,
  );
  const showThreadColdStart = useColdStartHint(
    isThreadLoading && !threadStreamingText,
  );
  const [aiError, setAiError] = useState(false);
  const [threadAiError, setThreadAiError] = useState(false);
  const [threadRetryMessage, setThreadRetryMessage] = useState("");
  const [dragChoiceIdx, setDragChoiceIdx] = useState<number | null>(null);

  const persistAnswer = useCallback(
    (next: Partial<BlockAnswer>) => {
      setAnswer(blockId, {
        placedByBlank,
        submitted,
        aiFeedback,
        feedbackThread,
        threadOpen,
        suggestions,
        ...next,
      });
    },
    [
      aiFeedback,
      blockId,
      feedbackThread,
      placedByBlank,
      setAnswer,
      submitted,
      suggestions,
      threadOpen,
    ],
  );

  useEffect(() => {
    const next = saved?.placedByBlank ?? blankIndices.map(() => null);
    setPlacedByBlank(blankIndices.map((_, i) => next[i] ?? null));
    setSubmitted(saved?.submitted ?? false);
    setAiFeedback(saved?.aiFeedback ?? "");
    setFeedbackThread(saved?.feedbackThread ?? []);
    setThreadOpen(saved?.threadOpen ?? false);
    setSuggestions(saved?.suggestions ?? []);
  }, [answers[blockId], blankIndices]);

  const usedChoiceSet = new Set(placedByBlank.filter((v): v is number => v !== null));
  const availableChoices = choices
    .map((text, idx) => ({ text, idx }))
    .filter((c) => !usedChoiceSet.has(c.idx));

  const isCorrectPerBlank = placedByBlank.map(
    (placed, i) => submitted && placed !== null && placed === (correctByBlank[i] ?? -1),
  );
  const isAllCorrect =
    submitted &&
    blankIndices.length > 0 &&
    placedByBlank.every((placed, i) => placed === (correctByBlank[i] ?? -1));

  const setPlaced = (blankPos: number, choiceIdx: number | null) => {
    if (submitted) return;
    setPlacedByBlank((prev) => {
      const next = [...prev];
      // Ensure unique usage: remove this choice from any old slot first
      const prevPos = next.findIndex((v) => v === choiceIdx);
      if (choiceIdx !== null && prevPos !== -1) next[prevPos] = null;
      next[blankPos] = choiceIdx;
      setFeedbackThread([]);
      setThreadOpen(false);
      setSuggestions([]);
      persistAnswer({
        placedByBlank: next,
        submitted: false,
        aiFeedback: "",
        feedbackThread: [],
        threadOpen: false,
        suggestions: [],
      });
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    setAiFeedback("");
    setAiError(false);
    setFeedbackThread([]);
    setThreadOpen(false);
    setSuggestions([]);
    persistAnswer({
      placedByBlank,
      submitted: true,
      aiFeedback: "",
      feedbackThread: [],
      threadOpen: false,
      suggestions: [],
    });

    setIsFeedbackLoading(true);
    setFeedbackStreamingText("");
    try {
      const totalBlanks = blankIndices.length;
      const matchedCount = placedByBlank.filter(
        (placed, i) => placed === (correctByBlank[i] ?? -1),
      ).length;
      const accuracyPercent =
        totalBlanks > 0 ? Math.round((matchedCount / totalBlanks) * 100) : 0;
      const evaluationLevel =
        accuracyPercent === 100
          ? "correct"
          : accuracyPercent >= 60
            ? "almost"
            : "incorrect";
      const correctAnswer = blankIndices
        .map((token, i) => {
          const choiceIdx = correctByBlank[i] ?? -1;
          const text = choiceIdx >= 0 ? choices[choiceIdx] ?? "" : "";
          return `[Q-${token}] = ${text}`;
        })
        .join(" | ");

      const userAnswer = blankIndices
        .map((token, i) => {
          const placed = placedByBlank[i];
          const text = typeof placed === "number" ? choices[placed] ?? "" : "(empty)";
          return `[Q-${token}] = ${text}`;
        })
        .join(" | ");
      const diagnostics = blankIndices
        .map((token, i) => {
          const placed = placedByBlank[i];
          const user = typeof placed === "number" ? choices[placed] ?? "(empty)" : "(empty)";
          const correctIdx = correctByBlank[i] ?? -1;
          const expected = correctIdx >= 0 ? choices[correctIdx] ?? "" : "(none)";
          if (placed === correctIdx) return "";
          return `[Q-${token}] expected="${expected}" got="${user}"`;
        })
        .filter(Boolean)
        .join(" ; ");

      const { reply, suggestions: nextSuggestions } = await callTutorStream(
        {
          contentId: contentId ?? "",
          blockId,
          mode: "question_feedback",
          message: userAnswer || "(ไม่ได้เลือกคำตอบ)",
          questionContext: {
            question: template || "Fill blank choice question",
            guideAnswer: correctAnswer,
            evaluation: {
              level: evaluationLevel,
              accuracyPercent,
              diagnostics,
            },
            feedbackMode,
          },
        },
        { onToken: (t) => setFeedbackStreamingText((prev) => prev + t) },
      );
      setAiFeedback(reply);
      setSuggestions(nextSuggestions);
      persistAnswer({
        placedByBlank,
        submitted: true,
        aiFeedback: reply,
        feedbackThread: [],
        threadOpen: false,
        suggestions: nextSuggestions,
      });
    } catch (error) {
      if (error instanceof AiUnavailableError) {
        setAiError(true);
      }
    } finally {
      setIsFeedbackLoading(false);
      setFeedbackStreamingText("");
    }
  };

  const handleReset = () => {
    const empty = blankIndices.map(() => null);
    setPlacedByBlank(empty);
    setSubmitted(false);
    setAiFeedback("");
    setFeedbackThread([]);
    setThreadOpen(false);
    setSuggestions([]);
    persistAnswer({
      placedByBlank: empty,
      submitted: false,
      aiFeedback: "",
      feedbackThread: [],
      threadOpen: false,
      suggestions: [],
    });
  };

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

      const userAnswer = blankIndices
        .map((token, i) => {
          const placed = placedByBlank[i];
          const text = typeof placed === "number" ? choices[placed] ?? "" : "(empty)";
          return `[Q-${token}] = ${text}`;
        })
        .join(" | ");

      setIsThreadLoading(true);
      setThreadAiError(false);
      setThreadStreamingText("");
      try {
        const { reply, suggestions: nextSuggestions } = await callTutorStream(
          {
            contentId: contentId ?? "",
            blockId,
            mode: "followup",
            message,
            clientThread: feedbackThreadToClientThread({
              originalAnswer: userAnswer,
              initialFeedback: aiFeedback,
              thread: feedbackThread,
            }),
          },
          { onToken: (t) => setThreadStreamingText((prev) => prev + t) },
        );
        const aiMessage: FeedbackThreadMessage = {
          role: "ai",
          text: reply,
          createdAt: new Date().toISOString(),
        };
        const nextThread = [...threadWithStudent, aiMessage];
        setFeedbackThread(nextThread);
        setSuggestions(nextSuggestions);
        setThreadAiError(false);
        setThreadRetryMessage("");
        persistAnswer({
          feedbackThread: nextThread,
          threadOpen: true,
          suggestions: nextSuggestions,
        });
      } catch (error) {
        if (error instanceof AiUnavailableError) {
          setThreadAiError(true);
          setThreadRetryMessage(message);
          setFeedbackThread(feedbackThread);
          persistAnswer({ feedbackThread, threadOpen: true });
        }
      } finally {
        setIsThreadLoading(false);
        setThreadStreamingText("");
      }
    },
    [
      aiFeedback,
      blankIndices,
      blockId,
      choices,
      contentId,
      feedbackThread,
      persistAnswer,
      placedByBlank,
    ],
  );

  if (blankIndices.length === 0) {
    return (
      <p className="text-base italic text-gray-400">
        {t("No blanks configured.", "ยังไม่ได้ตั้งค่าช่องว่าง")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-base text-gray-900">
        {pieces.map((piece, idx) =>
          piece.text !== undefined ? (
            <span key={`t-${idx}`} className="whitespace-pre-wrap">
              {piece.text}
            </span>
          ) : (
            (() => {
              const token = piece.blank ?? 0;
              const blankPos = tokenToPos.get(token) ?? 0;
              const placedIdx = placedByBlank[blankPos];
              const placedText = typeof placedIdx === "number" ? choices[placedIdx] : "";
              const isCorrect = isCorrectPerBlank[blankPos];
              return (
                <div
                  key={`b-${idx}`}
                  onDragOver={(e) => {
                    if (!submitted) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (submitted) return;
                    const dropped = Number(e.dataTransfer.getData("text/plain"));
                    if (Number.isFinite(dropped)) setPlaced(blankPos, dropped);
                  }}
                  className={[
                    "flex min-h-9 min-w-28 items-center gap-2 rounded border px-2 py-1",
                    submitted
                      ? isCorrect
                        ? "border-green-400 bg-green-50"
                        : "border-red-400 bg-red-50"
                      : "border-gray-300 bg-white",
                  ].join(" ")}
                >
                  {placedIdx === null ? (
                    <span className="text-xs text-gray-400">[Q-{token}]</span>
                  ) : (
                    <>
                      <span className="text-base text-gray-800">{placedText}</span>
                      {!submitted && (
                        <button
                          type="button"
                          onClick={() => setPlaced(blankPos, null)}
                          className="ml-auto text-xs text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })()
          ),
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-2">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          {t("Drag choices", "ลากตัวเลือก")}
        </p>
        <div className="flex flex-wrap gap-2">
          {availableChoices.map((choice) => (
            <button
              key={choice.idx}
              type="button"
              draggable={!submitted}
              onDragStart={(e) => {
                setDragChoiceIdx(choice.idx);
                e.dataTransfer.setData("text/plain", String(choice.idx));
              }}
              onDragEnd={() => setDragChoiceIdx(null)}
              disabled={submitted}
              className={[
                "rounded-md border px-2.5 py-1 text-base transition",
                dragChoiceIdx === choice.idx
                  ? "border-violet-400 bg-violet-50 text-violet-700"
                  : "border-gray-300 bg-white text-gray-700 hover:border-violet-300",
                submitted ? "opacity-50" : "cursor-grab",
              ].join(" ")}
            >
              {choice.text}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!submitted ? (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={placedByBlank.some((v) => v === null)}
            className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("Submit", "ส่ง")}
          </button>
        ) : (
          <>
            <span
              className={[
                "text-sm font-semibold",
                isAllCorrect ? "text-green-600" : "text-red-500",
              ].join(" ")}
            >
              {isAllCorrect
                ? t("All blanks are correct.", "ช่องว่างถูกทั้งหมด")
                : t("Some blanks are not correct.", "ยังมีบางช่องว่างไม่ถูกต้อง")}
            </span>
            <button
              type="button"
              onClick={handleReset}
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
          {aiError ? (
            <div className="mt-1">
              <AiErrorRetry
                onRetry={() => void handleSubmit()}
                loading={isFeedbackLoading}
              />
            </div>
          ) : isFeedbackLoading && feedbackStreamingText ? (
            <MarkdownMessage
              text={feedbackStreamingText}
              className="mt-1 text-base text-violet-900"
            />
          ) : isFeedbackLoading && showFeedbackColdStart ? (
            <p className="mt-1 text-base text-violet-900">
              {t(
                "Waking the AI up, one sec…",
                "ปลุก AI แป๊บนึงนะ เซิร์ฟเวอร์เพิ่งตื่น 😴",
              )}
            </p>
          ) : isFeedbackLoading ? (
            <p className="mt-1 text-base text-violet-900">
              {t("AI is generating detailed feedback...", "AI กำลังเขียนคำแนะนำแบบละเอียดให้...")}
            </p>
          ) : aiFeedback ? (
            <MarkdownMessage
              text={aiFeedback}
              className="mt-1 text-base text-violet-900"
            />
          ) : (
            <p className="mt-1 text-base text-violet-900">
              {t("No feedback yet", "ยังไม่มีคำแนะนำ")}
            </p>
          )}
        </div>
      )}
      {submitted && aiFeedback && !threadOpen && !isFeedbackLoading && (
        <SuggestionChips
          suggestions={suggestions}
          disabled={isThreadLoading}
          onPick={(text) => {
            setThreadOpen(true);
            void handleSendThreadMessage(text);
          }}
        />
      )}
      {submitted && aiFeedback && (
        <FeedbackDiscussionPanel
          messages={feedbackThread}
          open={threadOpen}
          loading={isThreadLoading}
          streamingText={threadStreamingText}
          coldStartHint={showThreadColdStart}
          suggestions={suggestions}
          onToggle={() => {
            const next = !threadOpen;
            setThreadOpen(next);
            persistAnswer({ threadOpen: next });
          }}
          onSend={handleSendThreadMessage}
        />
      )}
      {submitted && aiFeedback && threadAiError && (
        <AiErrorRetry
          onRetry={() => {
            if (threadRetryMessage) {
              void handleSendThreadMessage(threadRetryMessage);
            }
          }}
          loading={isThreadLoading}
        />
      )}
    </div>
  );
}

export default function QuestionBlankChoiceView({
  node,
  selected,
  getPos,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const { t } = useEditorI18n();
  const isEditable = editor.isEditable;
  const attrs = node.attrs as QuestionBlankChoiceAttrs;
  const [previewMode, setPreviewMode] = useState(false);

  const handleFlush = useCallback(
    (
      template: string,
      choices: string[],
      correctByBlank: number[],
      feedbackMode: QuestionFeedbackMode,
    ) => {
      updateAttributes({ template, choices, correctByBlank, feedbackMode });
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
                ? t("Fill blank (choice) - preview", "เติมคำ (ตัวเลือก) - ตัวอย่าง")
                : t("Fill blank (choice) - creator", "เติมคำ (ตัวเลือก) - ผู้สร้าง")}
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

              <BlockDeleteButton editor={editor} getPos={getPos} />
            </div>
          </div>
        )}

        {isEditable && !previewMode ? (
          <CreatorView
            initialTemplate={attrs.template}
            initialChoices={attrs.choices}
            initialCorrectByBlank={attrs.correctByBlank}
            initialFeedbackMode={attrs.feedbackMode}
            onFlush={handleFlush}
          />
        ) : (
          <ViewerView attrs={attrs} />
        )}
      </div>
    </NodeViewWrapper>
  );
}
