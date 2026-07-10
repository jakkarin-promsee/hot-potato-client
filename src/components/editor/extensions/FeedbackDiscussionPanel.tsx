import { useMemo, useState } from "react";
import { MessageCircle, SendHorizontal } from "lucide-react";
import MarkdownMessage from "./MarkdownMessage";
import { useEditorI18n } from "../editor.i18n";

export interface FeedbackThreadMessage {
  role: "student" | "ai";
  text: string;
  createdAt: string;
}

interface FeedbackDiscussionPanelProps {
  messages: FeedbackThreadMessage[];
  open: boolean;
  loading: boolean;
  onToggle: () => void;
  onSend: (message: string) => Promise<void> | void;
}

export default function FeedbackDiscussionPanel({
  messages,
  open,
  loading,
  onToggle,
  onSend,
}: FeedbackDiscussionPanelProps) {
  const { t } = useEditorI18n();
  const [draft, setDraft] = useState("");
  const hasMessages = messages.length > 0;
  const buttonLabel = useMemo(() => {
    if (open) return t("Hide follow-up", "ซ่อนคำถามต่อยอด");
    return hasMessages
      ? `${t("Submit another answer?", "ส่งคำตอบเพิ่มเติม?")} (${messages.length})`
      : t("Submit another answer?", "ส่งคำตอบเพิ่มเติม?");
  }, [hasMessages, messages.length, open, t]);

  const submit = async () => {
    const next = draft.trim();
    if (!next || loading) return;
    setDraft("");
    await onSend(next);
  };

  return (
    <div className="rounded-lg border border-violet-100 bg-white px-3 py-2">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600 underline transition hover:text-violet-700"
      >
        <MessageCircle className="h-4 w-4" />
        {buttonLabel}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {hasMessages ? (
            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
              {messages.map((message, index) => (
                <div
                  key={`${message.createdAt}-${index}`}
                  className={message.role === "student" ? "flex justify-end" : "flex justify-start"}
                >
                  {message.role === "student" ? (
                    <p className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900 shadow-sm">
                      {message.text}
                    </p>
                  ) : (
                    <MarkdownMessage
                      text={message.text}
                      className="max-w-[90%] rounded-2xl rounded-bl-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              {t(
                "Improve your answer and ask for another quick feedback round.",
                "ปรับคำตอบของคุณ แล้วขอคำแนะนำรอบใหม่ได้เลย",
              )}
            </p>
          )}

          <div className="flex items-start gap-2">
            <textarea
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder={t(
                "Try another answer or ask follow-up...",
                "ลองตอบใหม่หรือถามต่อยอด...",
              )}
              className="flex-1 resize-none overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-800 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
            <button
              type="button"
              onClick={() => void submit()}
              disabled={loading || !draft.trim()}
              className="flex h-10 items-center gap-1 rounded-lg bg-violet-600 px-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SendHorizontal className="h-3.5 w-3.5" />
              {t("Submit", "ส่ง")}
            </button>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onToggle}
              className="text-sm font-medium text-gray-400 underline transition hover:text-gray-600"
            >
              {t("Hide", "ซ่อน")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
