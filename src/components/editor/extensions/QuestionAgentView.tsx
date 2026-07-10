import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { useAnswerStore } from "@/stores/content-answer.store";
import { useCanvasStore } from "@/stores/canvas.store";
import {
  Bot,
  SendHorizontal,
  SquareDashedMousePointer,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { QuestionAgentAttrs } from "./QuestionAgentNode";
import {
  AiUnavailableError,
  callTutor,
  qaHistoryToClientThread,
} from "./tutorApi";
import AiErrorRetry from "./AiErrorRetry";
import MarkdownMessage from "./MarkdownMessage";
import SuggestionChips from "./SuggestionChips";
import BlockMoveControls from "./BlockMoveControls";
import { useEditorI18n } from "../editor.i18n";

export interface ChatMessage {
  question: string;
  answer: string;
  createdAt: string;
}

interface BlockAnswer {
  chatHistory: ChatMessage[];
  collapsed: boolean;
  suggestions?: string[];
}

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

export default function QuestionAgentView({
  node,
  selected,
  getPos,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const { t } = useEditorI18n();
  const attrs = node.attrs as QuestionAgentAttrs;
  const isEditable = editor.isEditable;
  const blockId = attrs.id as string;

  const answers = useAnswerStore((s) => s.answers);
  const setAnswer = useAnswerStore((s) => s.setAnswer);
  const contentId = useCanvasStore((s) => s.contentId);
  const savedAnswer = answers[blockId] as BlockAnswer | undefined;

  const [title, setTitle] = useState(attrs.title ?? t("Ask AI", "ถาม AI"));
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(
    savedAnswer?.chatHistory ?? attrs.chatHistory ?? [],
  );
  const [collapsed, setCollapsed] = useState<boolean>(
    savedAnswer?.collapsed ?? attrs.collapsed ?? true,
  );
  const [suggestions, setSuggestions] = useState<string[]>(
    savedAnswer?.suggestions ?? [],
  );
  const [questionInput, setQuestionInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [aiError, setAiError] = useState(false);
  const inputRef = useAutoGrow(questionInput);
  const hasAsked = chatHistory.length > 0;

  useEffect(() => setTitle(attrs.title ?? t("Ask AI", "ถาม AI")), [attrs.title, t]);
  useEffect(() => {
    if (!savedAnswer) return;
    setChatHistory(savedAnswer.chatHistory ?? []);
    setCollapsed(savedAnswer.collapsed ?? true);
    setSuggestions(savedAnswer.suggestions ?? []);
  }, [answers[blockId]]);

  const latestMessage = useMemo(
    () => (chatHistory.length ? chatHistory[chatHistory.length - 1] : null),
    [chatHistory],
  );

  const commit = useCallback(
    (next: Partial<QuestionAgentAttrs>) => {
      updateAttributes(next);
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

  const ask = async (question: string) => {
    if (!question || isAsking) return;

    setIsAsking(true);
    setAiError(false);
    try {
      const { reply, suggestions: nextSuggestions } = await callTutor({
        contentId: contentId ?? "",
        blockId,
        mode: "free_chat",
        message: question,
        clientThread: qaHistoryToClientThread(chatHistory),
      });
      const nextHistory = [
        ...chatHistory,
        { question, answer: reply, createdAt: new Date().toISOString() },
      ];
      setChatHistory(nextHistory);
      setSuggestions(nextSuggestions);
      setQuestionInput("");
      // Enter special mode automatically after first question.
      setCollapsed(false);
      setAnswer(blockId, {
        chatHistory: nextHistory,
        collapsed: false,
        suggestions: nextSuggestions,
      });
    } catch (error) {
      if (error instanceof AiUnavailableError) {
        setAiError(true);
      }
    } finally {
      setIsAsking(false);
    }
  };

  const handleAsk = () => ask(questionInput.trim());

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    setAnswer(blockId, { chatHistory, collapsed: next, suggestions });
  };

  const clearHistory = () => {
    setChatHistory([]);
    setCollapsed(true);
    setSuggestions([]);
    setAnswer(blockId, { chatHistory: [], collapsed: true, suggestions: [] });
  };

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
              <Bot className="h-3 w-3 text-violet-600" />
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => commit({ title })}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-40 rounded border border-transparent bg-transparent px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 outline-none focus:border-violet-200 focus:bg-white"
            />

            <div className="ml-auto flex items-center gap-1">
              <BlockMoveControls editor={editor} getPos={getPos} />
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

        {!hasAsked ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={questionInput}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => setQuestionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleAsk();
                  }
                }}
                placeholder={t("Ask AI something...", "ถาม AI ได้เลย...")}
                className="min-h-11 flex-1 resize-none overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-800 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => void handleAsk()}
                disabled={isAsking || !questionInput.trim()}
                className="flex h-11 items-center gap-1 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <SendHorizontal className="h-3.5 w-3.5" />
                {t("Ask", "ถาม")}
              </button>
            </div>
            {aiError && (
              <AiErrorRetry onRetry={() => void handleAsk()} loading={isAsking} />
            )}
          </div>
        ) : !collapsed ? (
          <div className="flex flex-col gap-3">
            <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
              {chatHistory.map((msg, i) => (
                <div key={`${msg.createdAt}-${i}`} className="space-y-1">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md border border-violet-200 bg-violet-50 px-3 py-2 text-base text-violet-900 shadow-sm">
                      {msg.question}
                    </div>
                  </div>
                  <div className="flex justify-start -mt-1">
                    <MarkdownMessage
                      text={msg.answer}
                      className="max-w-[85%] rounded-2xl rounded-bl-md border border-gray-200 bg-gray-50 px-3 py-2 text-base text-gray-800 shadow-sm"
                    />
                  </div>
                </div>
              ))}
              {isAsking && (
                <p className="text-sm text-gray-400">
                  {t("AI is typing...", "AI กำลังพิมพ์...")}
                </p>
              )}
            </div>

            {!isAsking && (
              <SuggestionChips
                suggestions={suggestions}
                onPick={(text) => void ask(text)}
              />
            )}

            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={questionInput}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => setQuestionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleAsk();
                  }
                }}
                placeholder={t("Ask AI something...", "ถาม AI ได้เลย...")}
                className="min-h-11 flex-1 resize-none overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-800 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => void handleAsk()}
                disabled={isAsking || !questionInput.trim()}
                className="flex h-11 items-center gap-1 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <SendHorizontal className="h-3.5 w-3.5" />
                {t("Ask", "ถาม")}
              </button>
            </div>
            {aiError && (
              <AiErrorRetry onRetry={() => void handleAsk()} loading={isAsking} />
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            {latestMessage ? (
              <div className="space-y-1.5">
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md border border-violet-200 bg-violet-50 px-3 py-2 text-base text-violet-900 shadow-sm">
                    {latestMessage.question}
                  </p>
                </div>
                <div className="flex justify-start -mt-1">
                  <MarkdownMessage
                    text={latestMessage.answer}
                    className="max-w-[85%] rounded-2xl rounded-bl-md border border-gray-200 bg-gray-50 px-3 py-2 text-base text-gray-800 shadow-sm"
                  />
                </div>
                {!isAsking && (
                  <SuggestionChips
                    suggestions={suggestions}
                    onPick={(text) => void ask(text)}
                  />
                )}
              </div>
            ) : (
              <p className="text-sm italic text-gray-400">
                {t("No chat yet. Expand to ask AI.", "ยังไม่มีแชต ขยายเพื่อถาม AI")}
              </p>
            )}
          </div>
        )}

        {hasAsked && (
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={toggleCollapsed}
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 underline transition hover:text-gray-700"
            >
              {collapsed ? (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  {t("Show chat", "แสดงแชต")}
                </>
              ) : (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  {t("Hide chat", "ซ่อนแชต")}
                </>
              )}
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={clearHistory}
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-400 underline transition hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("Clear history", "ล้างประวัติ")}
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
