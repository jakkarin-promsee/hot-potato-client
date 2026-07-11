/**
 * "สร้างคำถามด้วย AI" dialog (Tier 3.5.B) — opened from the Question panel in
 * EditorLeftSidebar. Preview-first: generated questions render as cards and
 * enter the document only when the teacher accepts (T2 rule).
 */
import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { Sparkles, X } from "lucide-react";
import {
  callCreator,
  type GeneratedQuestion,
  type GeneratedQuestionType,
} from "@/lib/creatorApi";
import { useCanvasStore } from "@/stores/canvas.store";
import { useColdStartHint } from "@/hooks/useColdStartHint";
import { useEditorI18n } from "../editor.i18n";
import { insertGeneratedQuestions } from "./questionInsert";
import QuestionPreviewCard, {
  questionTypeLabel,
  type PreviewCardStatus,
} from "./QuestionPreviewCard";

const ALL_TYPES: GeneratedQuestionType[] = [
  "choice",
  "write",
  "blank_choice",
  "blank_write",
];

type Difficulty = "easy" | "medium" | "hard" | "mixed";

export default function AiQuestionDialog({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const { t } = useEditorI18n();
  const contentId = useCanvasStore((s) => s.contentId);

  const [scope, setScope] = useState<"lesson" | "selection">("lesson");
  const [selectionText, setSelectionText] = useState("");
  const [types, setTypes] = useState<GeneratedQuestionType[]>([
    "choice",
    "write",
  ]);
  const [count, setCount] = useState(3);
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [results, setResults] = useState<GeneratedQuestion[] | null>(null);
  const [statuses, setStatuses] = useState<PreviewCardStatus[]>([]);
  const showColdStart = useColdStartHint(isLoading);

  const toggleType = (type: GeneratedQuestionType) => {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type],
    );
  };

  const canGenerate =
    !!contentId &&
    types.length > 0 &&
    !isLoading &&
    (scope === "lesson" || selectionText.trim().length > 0);

  const handleGenerate = async () => {
    if (!contentId) return;
    setIsLoading(true);
    setError(false);
    setResults(null);
    try {
      const { questions } = await callCreator(contentId, "generate_questions", {
        scope,
        selectionMarkdown:
          scope === "selection" ? selectionText.trim().slice(0, 12000) : undefined,
        types,
        count,
        difficulty,
      });
      setResults(questions);
      setStatuses(questions.map(() => "pending"));
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const setStatus = (index: number, status: PreviewCardStatus) => {
    setStatuses((prev) => prev.map((s, i) => (i === index ? status : s)));
  };

  const handleAdd = (index: number) => {
    if (!results) return;
    insertGeneratedQuestions(editor, [results[index]]);
    setStatus(index, "added");
  };

  const handleAddAll = () => {
    if (!results) return;
    const pending = results.filter((_, i) => statuses[i] === "pending");
    insertGeneratedQuestions(editor, pending);
    setStatuses((prev) => prev.map((s) => (s === "pending" ? "added" : s)));
  };

  const pendingCount = statuses.filter((s) => s === "pending").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 flex max-h-[85vh] w-[92vw] max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles size={15} className="text-primary" />
            {t("Generate questions with AI", "สร้างคำถามด้วย AI")}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close", "ปิด")}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {results === null ? (
            <div className="flex flex-col gap-4">
              {/* Scope */}
              <div>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  {t("Source content", "สร้างจากเนื้อหา")}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setScope("lesson")}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                      scope === "lesson"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {t("Whole lesson", "ทั้งบทเรียน")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope("selection")}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                      scope === "selection"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {t("Paste a section", "วางเนื้อหาเฉพาะส่วน")}
                  </button>
                </div>
                {scope === "selection" && (
                  <textarea
                    value={selectionText}
                    onChange={(e) => setSelectionText(e.target.value)}
                    rows={4}
                    placeholder={t(
                      "Paste the section to generate questions from…",
                      "วางเนื้อหาส่วนที่อยากให้สร้างคำถาม…",
                    )}
                    className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/40"
                  />
                )}
              </div>

              {/* Types */}
              <div>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  {t("Question types", "ประเภทคำถาม")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {ALL_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        types.includes(type)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {questionTypeLabel(type, t)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Count + difficulty */}
              <div className="flex gap-3">
                <label className="flex-1 text-xs font-semibold text-muted-foreground">
                  {t("How many", "จำนวนข้อ")}
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-normal text-foreground"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex-1 text-xs font-semibold text-muted-foreground">
                  {t("Difficulty", "ความยาก")}
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    className="mt-1.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-normal text-foreground"
                  >
                    <option value="mixed">{t("Mixed", "คละระดับ")}</option>
                    <option value="easy">{t("Easy", "ง่าย")}</option>
                    <option value="medium">{t("Medium", "ปานกลาง")}</option>
                    <option value="hard">{t("Hard", "ยาก")}</option>
                  </select>
                </label>
              </div>

              {error && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {t(
                    "AI is busy, try again in a moment 🥔",
                    "AI ไม่ว่างแป๊บนึง ลองอีกทีนะ 🥔",
                  )}
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={!canGenerate}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Sparkles size={14} />
                {isLoading
                  ? showColdStart
                    ? t(
                        "Waking the AI up, one sec…",
                        "ปลุก AI แป๊บนึงนะ เซิร์ฟเวอร์เพิ่งตื่น 😴",
                      )
                    : t("Thinking…", "น้องมันฝรั่งกำลังคิดคำถาม… 🥔")
                  : t("Generate", "สร้างคำถาม")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                {t(
                  "Review each question before adding it to the lesson.",
                  "ตรวจแต่ละข้อก่อนเพิ่มลงบทเรียนนะ ครูแก้ไขต่อในบล็อกได้เลย",
                )}
              </p>
              {results.map((q, i) => (
                <QuestionPreviewCard
                  key={i}
                  question={q}
                  status={statuses[i]}
                  onAdd={() => handleAdd(i)}
                  onDiscard={() => setStatus(i, "discarded")}
                />
              ))}
              {statuses.every((s) => s !== "pending") && (
                <p className="text-center text-xs text-muted-foreground">
                  {t("All done!", "จัดการครบทุกข้อแล้ว 🎉")}
                </p>
              )}
              <div className="flex gap-2">
                {pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={handleAddAll}
                    className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    {t("Add all", "เพิ่มทั้งหมด")} ({pendingCount})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setResults(null);
                    setStatuses([]);
                  }}
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent"
                >
                  {t("Generate again", "สร้างชุดใหม่")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
