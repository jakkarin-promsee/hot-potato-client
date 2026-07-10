import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEditorExtensions } from "./config/editorExtensions";
import { EditorContent, useEditor } from "@tiptap/react";
import { useCanvasStore } from "@/stores/canvas.store";
import { useAnswerStore } from "@/stores/content-answer.store";
import { useAuthStore } from "@/stores/auth.store";
import { Bot, Pencil, SendHorizontal, X } from "lucide-react";
import { getQuestionAgentViewportContext } from "./extensions/questionAgentContext";
import {
  AiUnavailableError,
  callTutor,
  qaHistoryToClientThread,
} from "./extensions/tutorApi";
import AiErrorRetry from "./extensions/AiErrorRetry";
import MarkdownMessage from "./extensions/MarkdownMessage";
import SuggestionChips from "./extensions/SuggestionChips";

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 4.0;
const ZOOM_STEP = 0.1;
const CONTENT_WIDTH = 400;
const PADDING = 24;
const MAX_DISPLAY_WIDTH = 500;
const CARD_PADDING = 40; // px-10 = 40px each side

/** Shared non-display layout for bottom FABs (each button sets inline-flex / responsive display). */
const fabButtonClassName =
  "items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-md transition";

function getInitialZoom() {
  const availableWidth = window.innerWidth - PADDING * 2;
  const targetWidth = Math.min(availableWidth, MAX_DISPLAY_WIDTH);
  return targetWidth / CONTENT_WIDTH;
}

type TiptapViewerProps = {
  onScrollDirectionChange?: (direction: "up" | "down") => void;
};

interface LessonAiMessage {
  question: string;
  answer: string;
  createdAt: string;
}

interface LessonAiAnswer {
  chatHistory: LessonAiMessage[];
  open?: boolean;
  suggestions?: string[];
}

const LESSON_AI_BLOCK_ID = "__lesson_ai_assistant__";

/** True when every vertical scroll ancestor from `start` up to `container` is at its top (cannot scroll further up). */
function isAtTopOfVerticalScrollChain(
  container: HTMLElement,
  start: EventTarget | null,
): boolean {
  let node: Element | null =
    start instanceof Element
      ? start
      : start instanceof Node
        ? start.parentElement
        : null;
  while (node) {
    if (node === container) return container.scrollTop <= 1;

    if (node instanceof HTMLElement) {
      const { overflowY } = window.getComputedStyle(node);
      const canScrollY =
        (overflowY === "auto" ||
          overflowY === "scroll" ||
          overflowY === "overlay") &&
        node.scrollHeight > node.clientHeight + 1;
      if (canScrollY && node.scrollTop > 1) return false;
    }

    node = node.parentElement;
  }
  return container.scrollTop <= 1;
}

/** Cap for the reading-position hint sent as `currentSection` (server caps at 500). */
const CURRENT_SECTION_MAX_CHARS = 300;

function TiptapViewer({ onScrollDirectionChange }: TiptapViewerProps) {
  const navigate = useNavigate();
  const mainRef = useRef<HTMLDivElement>(null);
  const aiChatListRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(getInitialZoom);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [questionInput, setQuestionInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState(false);
  const [isConfirmClear, setIsConfirmClear] = useState(false);

  const { tiptapJson, contentId, ownerId, collaborators } = useCanvasStore();
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const canEditContent = useMemo(() => {
    if (!contentId || !userId || !ownerId) return false;
    const uid = String(userId);
    const oid = String(ownerId);
    return (
      uid === oid || collaborators.some((c) => String(c) === uid)
    );
  }, [collaborators, contentId, ownerId, userId]);
  const answers = useAnswerStore((s) => s.answers);
  const setAnswer = useAnswerStore((s) => s.setAnswer);
  const savedLessonAi = answers[LESSON_AI_BLOCK_ID] as
    | LessonAiAnswer
    | undefined;
  const [chatHistory, setChatHistory] = useState<LessonAiMessage[]>(
    savedLessonAi?.chatHistory ?? [],
  );
  const [aiSuggestions, setAiSuggestions] = useState<string[]>(
    savedLessonAi?.suggestions ?? [],
  );

  useEffect(() => {
    if (!savedLessonAi) return;
    setChatHistory(savedLessonAi.chatHistory ?? []);
    setAiSuggestions(savedLessonAi.suggestions ?? []);
    if (typeof savedLessonAi.open === "boolean") {
      setIsAiOpen(savedLessonAi.open);
    }
  }, [answers[LESSON_AI_BLOCK_ID]]);

  const editor = useEditor({
    extensions: createEditorExtensions(false),
    editable: false,
    content: tiptapJson && tiptapJson !== "{}" ? JSON.parse(tiptapJson) : "",
  });

  // Set content once editor + data are ready
  useEffect(() => {
    if (editor && tiptapJson && tiptapJson !== "{}") {
      editor.commands.setContent(JSON.parse(tiptapJson));
    }
  }, [editor, tiptapJson]);

  // ── Fit to viewport on resize ─────────────────────────────────────────────
  useEffect(() => {
    const updateZoom = () => {
      const availableWidth = window.innerWidth - PADDING * 2;
      const targetWidth = Math.min(availableWidth, MAX_DISPLAY_WIDTH);
      setZoom(targetWidth / CONTENT_WIDTH);
    };
    window.addEventListener("resize", updateZoom);
    return () => window.removeEventListener("resize", updateZoom);
  }, []);

  // ── Ctrl+Scroll zoom ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      setZoom((prev) => {
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const next = Math.round((prev + delta) * 100) / 100;
        return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Detect reading direction on the scroll container itself.
  useEffect(() => {
    const el = mainRef.current;
    if (!el || !onScrollDirectionChange) return;

    let lastScrollTop = 0;
    const MIN_DELTA = 6;

    const onScroll = () => {
      const current = el.scrollTop;
      const delta = current - lastScrollTop;
      if (Math.abs(delta) < MIN_DELTA) return;

      onScrollDirectionChange(delta > 0 ? "down" : "up");
      lastScrollTop = current;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScrollDirectionChange]);

  // When scroll position is already at the top, scroll events do not fire for
  // "scroll up" — but the user may still wheel/trackpad upward to reveal the nav.
  useEffect(() => {
    const el = mainRef.current;
    if (!el || !onScrollDirectionChange) return;

    const MIN_DELTA = 6;

    const onWheelRevealNav = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      if (e.deltaY > -MIN_DELTA) return;
      if (!isAtTopOfVerticalScrollChain(el, e.target)) return;
      onScrollDirectionChange("up");
    };

    el.addEventListener("wheel", onWheelRevealNav, { passive: true });
    return () => el.removeEventListener("wheel", onWheelRevealNav);
  }, [onScrollDirectionChange]);

  // ── Ctrl +/- keyboard shortcuts ───────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setZoom((prev) =>
          Math.min(ZOOM_MAX, Math.round((prev + 0.25) * 100) / 100),
        );
      } else if (e.key === "-") {
        e.preventDefault();
        setZoom((prev) =>
          Math.max(ZOOM_MIN, Math.round((prev - 0.25) * 100) / 100),
        );
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(getInitialZoom()); // reset to fit, not hardcoded 1.0
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const ask = async (question: string) => {
    if (!question || !editor || isAsking) return;

    setIsAsking(true);
    setAskError(false);
    try {
      const viewportContext = mainRef.current
        ? getQuestionAgentViewportContext(mainRef.current)
        : "";
      const { reply, suggestions } = await callTutor({
        contentId: contentId ?? "",
        blockId: LESSON_AI_BLOCK_ID,
        mode: "free_chat",
        message: question,
        clientThread: qaHistoryToClientThread(chatHistory),
        currentSection: viewportContext
          ? viewportContext.slice(0, CURRENT_SECTION_MAX_CHARS)
          : undefined,
      });
      const nextHistory = [
        ...chatHistory,
        { question, answer: reply, createdAt: new Date().toISOString() },
      ];
      setChatHistory(nextHistory);
      setAiSuggestions(suggestions);
      setQuestionInput("");
      setAnswer(LESSON_AI_BLOCK_ID, {
        chatHistory: nextHistory,
        open: true,
        suggestions,
      });
    } catch (error) {
      if (error instanceof AiUnavailableError) {
        // Keep the question in the input; show an inline retry instead of
        // saving a fake reply into history.
        setAskError(true);
      }
    } finally {
      setIsAsking(false);
    }
  };

  const handleAsk = () => ask(questionInput.trim());

  const closeAi = () => {
    setIsAiOpen(false);
    setAnswer(LESSON_AI_BLOCK_ID, {
      chatHistory,
      open: false,
      suggestions: aiSuggestions,
    });
  };

  const openAi = () => {
    setIsAiOpen(true);
    setAnswer(LESSON_AI_BLOCK_ID, {
      chatHistory,
      open: true,
      suggestions: aiSuggestions,
    });
  };

  const clearAiHistory = () => {
    setChatHistory([]);
    setAiSuggestions([]);
    setAnswer(LESSON_AI_BLOCK_ID, {
      chatHistory: [],
      open: true,
      suggestions: [],
    });
    setIsConfirmClear(false);
  };

  const requestClearAiHistory = () => {
    if (!isConfirmClear) {
      setIsConfirmClear(true);
      return;
    }
    clearAiHistory();
  };

  useEffect(() => {
    if (!isConfirmClear) return;
    const timer = setTimeout(() => setIsConfirmClear(false), 3500);
    return () => clearTimeout(timer);
  }, [isConfirmClear]);

  // Keep the newest AI message visible in the modal.
  useEffect(() => {
    const el = aiChatListRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatHistory.length, isAsking, isAiOpen]);

  return (
    <div className="editor-layout editor-layout--viewer">
      <main ref={mainRef} className="editor-main">
        <div
          style={{
            width: `${CONTENT_WIDTH + CARD_PADDING * 2}px`, // 680px
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            marginLeft: `calc((100vw - ${
              CONTENT_WIDTH + CARD_PADDING * 2
            }px * ${zoom}) / 2)`,
          }}
          className="w-fit mx-auto editor-card shadow-sm"
        >
          <div
            className="tiptap-editor tiptap-editor--viewer mx-auto py-10"
            style={{ width: "400px" }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>
      </main>

      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={openAi}
          className={`inline-flex ${fabButtonClassName} border border-violet-300 bg-white text-violet-700 hover:bg-violet-50`}
        >
          <Bot className="h-4 w-4" />
          Ask AI
        </button>
        {canEditContent && (
          <button
            type="button"
            onClick={() => navigate(`/canvas/${contentId}`)}
            className={`hidden md:inline-flex ${fabButtonClassName} border border-violet-600 bg-violet-600 text-white shadow-md ring-1 ring-violet-500/30 hover:border-violet-700 hover:bg-violet-700 hover:ring-violet-400/40`}
          >
            <Pencil className="h-4 w-4 shrink-0 text-white" />
            Edit
          </button>
        )}
      </div>

      {isAiOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-1.5 md:p-3 md:items-center">
          <div className="flex h-[96dvh] w-full max-w-none flex-col rounded-lg border border-border bg-background shadow-2xl md:h-[80vh] md:max-w-2xl md:rounded-xl">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Bot className="h-4 w-4 text-violet-600" />
              <p className="text-sm font-semibold text-foreground">Ask AI</p>

              <button
                type="button"
                onClick={requestClearAiHistory}
                className={[
                  "ml-auto rounded border px-2 py-1 text-xs font-semibold transition",
                  isConfirmClear
                    ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
                    : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                ].join(" ")}
              >
                {isConfirmClear ? "Confirm clear" : "Clear chat"}
              </button>
              <button
                type="button"
                onClick={closeAi}
                className="rounded p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="Close Ask AI"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              ref={aiChatListRef}
              className="flex-1 space-y-2 overflow-y-auto px-4 py-3"
            >
              {chatHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ask anything while reading. AI will use the section you are
                  currently on.
                </p>
              ) : (
                chatHistory.map((msg, i) => (
                  <div key={`${msg.createdAt}-${i}`} className="space-y-1.5">
                    <div className="flex justify-end">
                      <p className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
                        {msg.question}
                      </p>
                    </div>
                    <div className="flex justify-start">
                      <MarkdownMessage
                        text={msg.answer}
                        className="max-w-[90%] rounded-2xl rounded-bl-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800"
                      />
                    </div>
                  </div>
                ))
              )}
              {isAsking && (
                <p className="text-sm text-muted-foreground">AI กำลังพิมพ์...</p>
              )}
              {askError && (
                <AiErrorRetry
                  onRetry={() => void handleAsk()}
                  loading={isAsking}
                />
              )}
            </div>

            <div className="border-t border-border px-4 py-3">
              {!isAsking && aiSuggestions.length > 0 && (
                <div className="pb-2">
                  <SuggestionChips
                    suggestions={aiSuggestions}
                    onPick={(text) => void ask(text)}
                  />
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  rows={1}
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleAsk();
                    }
                  }}
                  placeholder="Ask AI about this section..."
                  className="min-h-11 flex-1 resize-none overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-800 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                />
                <button
                  type="button"
                  onClick={() => void handleAsk()}
                  disabled={isAsking || !questionInput.trim()}
                  className="flex h-11 items-center gap-1 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <SendHorizontal className="h-3.5 w-3.5" />
                  Ask
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TiptapViewer;
