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
import { Eye, EyeOff, HelpCircle } from "lucide-react";
import type { QuestionBlankWriteAttrs } from "./QuestionBlankWriteNode";
import BlockMoveControls from "./BlockMoveControls";
import BlockDeleteButton from "./BlockDeleteButton";
import { useAutoGrow } from "./useAutoGrow";
import { useEditorI18n } from "../editor.i18n";

interface BlockAnswer {
  inputs: string[];
  submitted: boolean;
  aiFeedback?: string;
  feedbackThread?: FeedbackThreadMessage[];
  threadOpen?: boolean;
  suggestions?: string[];
}

interface InlineBlankTextareaProps {
  value: string;
  disabled: boolean;
  placeholder: string;
  onChange: (value: string) => void;
}

function InlineBlankTextarea({
  value,
  disabled,
  placeholder,
  onChange,
}: InlineBlankTextareaProps) {
  const ref = useAutoGrow(value);

  return (
    <textarea
      ref={ref}
      rows={1}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={[
        "min-w-28 w-40 max-w-full resize-none overflow-hidden rounded border px-2 py-1 text-base outline-none transition",
        disabled
          ? "border-violet-300 bg-violet-50 text-violet-900"
          : "border-gray-300 bg-white text-gray-800 focus:border-violet-400 focus:ring-2 focus:ring-violet-100",
      ].join(" ")}
      placeholder={placeholder}
    />
  );
}

// Supports both:
// - New: [Q-0], [Q-1], ...
// - Legacy: {{0}}, {{1}}, ...
const BLANK_TOKEN_REGEX = /\[Q-(\d+)\]|\{\{(\d+)\}\}/g;

const getBlankIndices = (template: string): number[] => {
  const unique = new Set<number>();
  let match: RegExpExecArray | null = null;
  while ((match = BLANK_TOKEN_REGEX.exec(template)) !== null) {
    const idx = match[1] ?? match[2];
    unique.add(Number(idx));
  }
  return [...unique].sort((a, b) => a - b);
};

const buildAnswers = (
  prevTemplate: string,
  prevAnswers: string[],
  nextTemplate: string,
) => {
  const prevIndices = getBlankIndices(prevTemplate);
  const nextIndices = getBlankIndices(nextTemplate);

  const prevMap = new Map<number, string>();
  prevIndices.forEach((blankTokenIdx, i) => {
    prevMap.set(blankTokenIdx, prevAnswers[i] ?? "");
  });

  return nextIndices.map((blankTokenIdx) => prevMap.get(blankTokenIdx) ?? "");
};

const renderTemplatePieces = (template: string) => {
  const pieces: Array<{ text?: string; blank?: number }> = [];
  let last = 0;
  let match: RegExpExecArray | null = null;
  while ((match = BLANK_TOKEN_REGEX.exec(template)) !== null) {
    if (match.index > last) {
      pieces.push({ text: template.slice(last, match.index) });
    }
    const idx = match[1] ?? match[2];
    pieces.push({ blank: Number(idx) });
    last = BLANK_TOKEN_REGEX.lastIndex;
  }
  if (last < template.length) {
    pieces.push({ text: template.slice(last) });
  }
  return pieces;
};

interface CreatorViewProps {
  initialTemplate: string;
  initialBlankAnswers: string[];
  initialFeedbackMode: QuestionFeedbackMode;
  onFlush: (
    template: string,
    blankAnswers: string[],
    feedbackMode: QuestionFeedbackMode,
  ) => void;
}

function CreatorView({
  initialTemplate,
  initialBlankAnswers,
  initialFeedbackMode,
  onFlush,
}: CreatorViewProps) {
  const { t } = useEditorI18n();
  const [template, setTemplate] = useState(initialTemplate);
  const [blankAnswers, setBlankAnswers] = useState(initialBlankAnswers);
  const [feedbackMode, setFeedbackMode] = useState<QuestionFeedbackMode>(
    initialFeedbackMode,
  );
  const templateRef = useAutoGrow(template);

  useEffect(() => setTemplate(initialTemplate), [initialTemplate]);
  useEffect(() => setBlankAnswers(initialBlankAnswers), [initialBlankAnswers]);
  useEffect(() => setFeedbackMode(initialFeedbackMode), [initialFeedbackMode]);

  const indices = useMemo(() => getBlankIndices(template), [template]);

  const flush = useCallback(
    (nextTemplate: string, nextAnswers: string[]) => {
      const fixedAnswers = buildAnswers(template, nextAnswers, nextTemplate);
      onFlush(nextTemplate, fixedAnswers, feedbackMode);
    },
    [feedbackMode, onFlush, template],
  );

  const insertTokenAtCursor = useCallback(
    (token: string) => {
      const el = templateRef.current;
      const start = el?.selectionStart ?? template.length;
      const end = el?.selectionEnd ?? template.length;
      const nextTemplate = `${template.slice(0, start)}${token}${template.slice(end)}`;
      const nextAnswers = buildAnswers(template, blankAnswers, nextTemplate);

      setTemplate(nextTemplate);
      setBlankAnswers(nextAnswers);

      requestAnimationFrame(() => {
        const nextPos = start + token.length;
        if (!templateRef.current) return;
        templateRef.current.focus();
        templateRef.current.setSelectionRange(nextPos, nextPos);
      });
    },
    [templateRef, template, blankAnswers],
  );

  const handleAddBlank = useCallback(() => {
    const maxIdx = indices.length ? Math.max(...indices) : -1;
    const nextIdx = maxIdx + 1;
    insertTokenAtCursor(`[Q-${nextIdx}]`);
  }, [indices, insertTokenAtCursor]);

  const previewPieces = useMemo(() => renderTemplatePieces(template), [template]);

  return (
    <div className="flex flex-col gap-3" onMouseDown={(e) => e.stopPropagation()}>
      <QuestionFeedbackModeToggle
        mode={feedbackMode}
        onChange={(nextMode) => {
          setFeedbackMode(nextMode);
          onFlush(template, blankAnswers, nextMode);
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAddBlank}
          className="rounded-md border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-100"
        >
          {t("Add blank", "เพิ่มช่องว่าง")}
        </button>

        <span className="text-[11px] text-gray-400">
          {t(
            "Tip: click inside the text, then press “Add blank”.",
            "เคล็ดลับ: คลิกในข้อความ แล้วกด “เพิ่มช่องว่าง”",
          )}
        </span>

        {indices.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-1">
            {indices.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => insertTokenAtCursor(`[Q-${i}]`)}
                className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500 transition hover:border-violet-300 hover:text-violet-700"
                title={t("Insert this blank token at cursor", "แทรกโทเค็นช่องว่างที่ตำแหน่งเคอร์เซอร์")}
              >
                {`[Q-${i}]`}
              </button>
            ))}
          </div>
        )}
      </div>

      <textarea
        ref={templateRef}
        rows={2}
        value={template}
        placeholder={t(
          "Type your sentence here, then use “Add blank” to insert [Q-0], [Q-1], ...",
          "พิมพ์ประโยคที่นี่ แล้วใช้ “เพิ่มช่องว่าง” เพื่อแทรก [Q-0], [Q-1], ...",
        )}
        onChange={(e) => {
          const nextTemplate = e.target.value;
          const nextAnswers = buildAnswers(template, blankAnswers, nextTemplate);
          setTemplate(nextTemplate);
          setBlankAnswers(nextAnswers);
        }}
        onBlur={() => flush(template, blankAnswers)}
        className="w-full resize-none overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
      />

      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {t("Preview", "ตัวอย่าง")}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-base text-gray-900">
          {previewPieces.map((piece, idx) =>
            piece.text !== undefined ? (
              <span key={`pt-${idx}`} className="whitespace-pre-wrap">
                {piece.text}
              </span>
            ) : (
              <span
                key={`pb-${idx}`}
                className="inline-flex min-w-16 items-center justify-center rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700"
              >
                {t(`Blank ${piece.blank}`, `ช่องว่าง ${piece.blank}`)}
              </span>
            ),
          )}
        </div>
      </div>

      {indices.length === 0 ? (
        <p className="text-xs text-amber-600">
          {t(
            "Add at least one blank using the “Add blank” button.",
            "เพิ่มช่องว่างอย่างน้อยหนึ่งช่องด้วยปุ่ม “เพิ่มช่องว่าง”",
          )}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {indices.map((blankIdx, i) => (
            <input
              key={blankIdx}
              type="text"
              value={blankAnswers[i] ?? ""}
              placeholder={t(
                `Answer for blank [Q-${blankIdx}]`,
                `คำตอบสำหรับช่องว่าง [Q-${blankIdx}]`,
              )}
              onChange={(e) => {
                const next = [...blankAnswers];
                next[i] = e.target.value;
                setBlankAnswers(next);
              }}
              onBlur={() => flush(template, blankAnswers)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-800 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ViewerView({ attrs }: { attrs: QuestionBlankWriteAttrs }) {
  const { t } = useEditorI18n();
  const { id: blockId, template, blankAnswers, feedbackMode } = attrs;
  const answers = useAnswerStore((s) => s.answers);
  const setAnswer = useAnswerStore((s) => s.setAnswer);
  const contentId = useCanvasStore((s) => s.contentId);

  const blankIndices = useMemo(() => getBlankIndices(template), [template]);
  const pieces = useMemo(() => renderTemplatePieces(template), [template]);
  const blankPosByToken = useMemo(() => {
    const m = new Map<number, number>();
    blankIndices.forEach((tokenIdx, pos) => m.set(tokenIdx, pos));
    return m;
  }, [blankIndices]);

  const saved = answers[blockId] as BlockAnswer | undefined;
  const [inputs, setInputs] = useState<string[]>(
    saved?.inputs ?? blankAnswers.map(() => ""),
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

  const persistAnswer = useCallback(
    (next: Partial<BlockAnswer>) => {
      setAnswer(blockId, {
        inputs,
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
      inputs,
      setAnswer,
      submitted,
      suggestions,
      threadOpen,
    ],
  );

  useEffect(() => {
    const next = saved?.inputs ?? blankAnswers.map(() => "");
    setInputs(blankAnswers.map((_, i) => next[i] ?? ""));
    setSubmitted(saved?.submitted ?? false);
    setAiFeedback(saved?.aiFeedback ?? "");
    setFeedbackThread(saved?.feedbackThread ?? []);
    setThreadOpen(saved?.threadOpen ?? false);
    setSuggestions(saved?.suggestions ?? []);
  }, [answers[blockId], blankAnswers]);

  const hasInput = inputs.some((v) => v.trim().length > 0);

  const updateInput = (i: number, value: string) => {
    const next = [...inputs];
    next[i] = value;
    setInputs(next);
    setFeedbackThread([]);
    setThreadOpen(false);
    setSuggestions([]);
    persistAnswer({
      inputs: next,
      submitted: false,
      aiFeedback: "",
      feedbackThread: [],
      threadOpen: false,
      suggestions: [],
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
      inputs,
      submitted: true,
      aiFeedback: "",
      feedbackThread: [],
      threadOpen: false,
      suggestions: [],
    });

    setIsFeedbackLoading(true);
    setFeedbackStreamingText("");
    try {
      const userAnswer = inputs
        .map(
          (value, idx) =>
            `[Q-${blankIndices[idx] ?? idx}] = ${value.trim() || "(empty)"}`,
        )
        .join(" | ");
      const guideAnswer = blankAnswers
        .map(
          (value, idx) =>
            `[Q-${blankIndices[idx] ?? idx}] = ${value.trim() || "(open)"}`,
        )
        .join(" | ");

      const { reply, suggestions: nextSuggestions } = await callTutorStream(
        {
          contentId: contentId ?? "",
          blockId,
          mode: "question_feedback",
          message: userAnswer || "(ไม่ได้ตอบ)",
          questionContext: {
            question: template || "Fill blank write question",
            guideAnswer,
            evaluation: {
              level: "ai_judge",
              diagnostics:
                "Typed fill-in answers; wording may differ from the guide — judge meaning kindly, not exact match.",
            },
            feedbackMode,
          },
        },
        { onToken: (t) => setFeedbackStreamingText((prev) => prev + t) },
      );
      setAiFeedback(reply);
      setSuggestions(nextSuggestions);
      persistAnswer({
        inputs,
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
    const empty = blankAnswers.map(() => "");
    setInputs(empty);
    setSubmitted(false);
    setAiFeedback("");
    setFeedbackThread([]);
    setThreadOpen(false);
    setSuggestions([]);
    persistAnswer({
      inputs: empty,
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

      const userAnswer = inputs
        .map(
          (value, idx) => `[Q-${blankIndices[idx] ?? idx}] = ${value.trim() || "(empty)"}`,
        )
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
      contentId,
      feedbackThread,
      inputs,
      persistAnswer,
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
              const tokenIdx = piece.blank ?? 0;
              const pos = blankPosByToken.get(tokenIdx) ?? 0;
              return (
                <InlineBlankTextarea
                  key={`b-${idx}`}
                  disabled={submitted}
                  value={inputs[pos] ?? ""}
                  onChange={(nextValue) => updateInput(pos, nextValue)}
                  placeholder={`[Q-${tokenIdx}]`}
                />
              );
            })()
          ),
        )}
      </div>

      <div className="flex items-center gap-3">
        {!submitted ? (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!hasInput}
            className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("Submit", "ส่ง")}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-gray-400 underline transition hover:text-gray-600"
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

export default function QuestionBlankWriteView({
  node,
  selected,
  getPos,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const { t } = useEditorI18n();
  const isEditable = editor.isEditable;
  const attrs = node.attrs as QuestionBlankWriteAttrs;
  const [previewMode, setPreviewMode] = useState(false);

  const handleFlush = useCallback(
    (
      template: string,
      blankAnswers: string[],
      feedbackMode: QuestionFeedbackMode,
    ) => {
      updateAttributes({ template, blankAnswers, feedbackMode });
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
                ? t("Fill blank (write) - preview", "เติมคำ (เขียน) - ตัวอย่าง")
                : t("Fill blank (write) - creator", "เติมคำ (เขียน) - ผู้สร้าง")}
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
            initialBlankAnswers={attrs.blankAnswers}
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
