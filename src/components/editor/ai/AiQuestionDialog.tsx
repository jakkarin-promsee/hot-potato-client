/**
 * "สร้างคำถามด้วย AI" dialog (Tier 3.5.B) — opened from the Question panel in
 * EditorLeftSidebar. Preview-first: generated questions render as cards and
 * enter the document only when the teacher accepts (T2 rule).
 *
 * Insert position: captured once on open (`captureQuestionInsertPos`) because
 * the modal steals editor focus — blocks land where the caret was when the
 * teacher opened this dialog, not at the doc end.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Sparkles, X } from "lucide-react";
import {
  callCreator,
  type GeneratedQuestion,
  type GeneratedQuestionType,
} from "@/lib/creatorApi";
import { useCanvasStore } from "@/stores/canvas.store";
import { useCreatorGradeLevelStore } from "@/stores/creatorGradeLevel.store";
import { useColdStartHint } from "@/hooks/useColdStartHint";
import { useEditorI18n } from "../editor.i18n";
import {
  formatHeadingOptionLabel,
  listHeadings,
  selectedSectionsMarkdown,
} from "./draftHelpers";
import {
  captureQuestionInsertPos,
  insertGeneratedQuestions,
} from "./questionInsert";
import QuestionPreviewCard, {
  questionTypeLabel,
  type PreviewCardStatus,
} from "./QuestionPreviewCard";
import { GRADE_LEVELS } from "./writingAssist";

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
  const insertPosRef = useRef(captureQuestionInsertPos(editor));

  const headings = useMemo(() => listHeadings(editor), [editor]);
  const headingsKey = headings.map((h) => `${h.pos}-${h.text}`).join("|");

  const [selectedSections, setSelectedSections] = useState<number[]>([]);
  const [styleHint, setStyleHint] = useState("");
  const [types, setTypes] = useState<GeneratedQuestionType[]>([
    "choice",
    "write",
  ]);
  const [count, setCount] = useState(3);
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const gradeLevel = useCreatorGradeLevelStore((s) => s.gradeLevel);
  const setGradeLevel = useCreatorGradeLevelStore((s) => s.setGradeLevel);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [results, setResults] = useState<GeneratedQuestion[] | null>(null);
  const [statuses, setStatuses] = useState<PreviewCardStatus[]>([]);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const showColdStart = useColdStartHint(isLoading);

  useEffect(() => {
    setSelectedSections(headings.map((_, i) => i));
  }, [headingsKey]);

  const allSectionsSelected =
    headings.length > 0 && selectedSections.length === headings.length;
  const someSectionsSelected =
    selectedSections.length > 0 &&
    selectedSections.length < headings.length;

  const insertPosNote = t(
    "Question blocks insert where your cursor was when you opened this dialog — place the cursor first.",
    "บล็อกคำถามจะแทรกตรงตำแหน่งที่เคอร์เซอร์อยู่ตอนเปิดหน้าต่างนี้ — วางเคอร์เซอร์ให้ตรงก่อนเปิดนะ",
  );

  const toggleSelectAll = () => {
    if (allSectionsSelected) {
      setSelectedSections([]);
    } else {
      setSelectedSections(headings.map((_, i) => i));
    }
  };

  const toggleSection = (index: number) => {
    setSelectedSections((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index].sort((a, b) => a - b),
    );
  };

  const toggleType = (type: GeneratedQuestionType) => {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type],
    );
  };

  const canGenerate =
    !!contentId &&
    types.length > 0 &&
    !isLoading &&
    (headings.length === 0 || selectedSections.length > 0);

  const handleGenerate = async () => {
    if (!contentId) return;
    const useWholeLesson =
      headings.length === 0 || selectedSections.length === headings.length;
    setIsLoading(true);
    setError(false);
    setResults(null);
    try {
      const { questions } = await callCreator(contentId, "generate_questions", {
        scope: useWholeLesson ? "lesson" : "selection",
        selectionMarkdown: useWholeLesson
          ? undefined
          : selectedSectionsMarkdown(editor, selectedSections, headings),
        types,
        count,
        difficulty,
        gradeLevel: gradeLevel || undefined,
        styleHint: styleHint.trim() ? styleHint.trim().slice(0, 500) : undefined,
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
    insertGeneratedQuestions(editor, [results[index]], insertPosRef.current);
    setStatus(index, "added");
  };

  const handleAddAll = () => {
    if (!results) return;
    const pending = results.filter((_, i) => statuses[i] === "pending");
    insertGeneratedQuestions(editor, pending, insertPosRef.current);
    setStatuses((prev) => prev.map((s) => (s === "pending" ? "added" : s)));
  };

  const pendingCount = statuses.filter((s) => s === "pending").length;

  const hasUnsavedWork =
    isLoading ||
    styleHint.trim().length > 0 ||
    (results !== null && pendingCount > 0);

  const requestClose = () => {
    if (!hasUnsavedWork) {
      onClose();
      return;
    }
    setCloseConfirmOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onMouseDown={requestClose}
      />
      <div
        className="relative z-10 flex h-[90vh] w-[96vw] max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles size={15} className="text-primary" />
            {t("Generate questions with AI", "สร้างคำถามด้วย AI")}
          </span>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t("Close", "ปิด")}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {results === null ? (
            <div className="flex flex-col gap-4">
              <p className="text-[11px] text-muted-foreground">{insertPosNote}</p>

              {headings.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                    {t("Source content", "สร้างจากเนื้อหา")}
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-background p-2">
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold transition hover:bg-accent">
                      <input
                        type="checkbox"
                        checked={allSectionsSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSectionsSelected;
                        }}
                        onChange={toggleSelectAll}
                        className="rounded border-border"
                      />
                      {t("Select all", "เลือกทั้งหมด")}
                    </label>
                    {headings.map((h, i) => (
                      <label
                        key={`${h.pos}-${i}`}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSections.includes(i)}
                          onChange={() => toggleSection(i)}
                          className="rounded border-border"
                        />
                        {formatHeadingOptionLabel(h)}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <label className="text-xs font-semibold text-muted-foreground">
                {t(
                  "What kind of content? (optional)",
                  "อยากได้เนื้อหาแบบไหน (ไม่บังคับ)",
                )}
                <textarea
                  value={styleHint}
                  onChange={(e) => setStyleHint(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder={t(
                    "e.g. focus on real-life examples, avoid trick questions",
                    "เช่น เน้นตัวอย่างในชีวิตประจำวัน ไม่เอาคำถามกับกัน",
                  )}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:ring-1 focus:ring-primary/40"
                />
              </label>

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
                <label className="flex-1 text-xs font-semibold text-muted-foreground">
                  {t("Grade level", "ระดับชั้น")}
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-normal text-foreground"
                  >
                    <option value="">{t("Select grade", "เลือกระดับชั้น")}</option>
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
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
              <p className="text-[11px] text-muted-foreground">{insertPosNote}</p>
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

      {closeConfirmOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCloseConfirmOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">
              {t("Leave this dialog?", "ออกจากหน้าต่างนี้?")}
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t(
                "Generated questions you have not added yet will be lost if you leave now.",
                "คำถามที่ยังไม่ได้เพิ่มลงบทเรียนจะหายไปถ้าออกตอนนี้",
              )}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCloseConfirmOpen(false)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-accent"
              >
                {t("Stay", "อยู่ต่อ")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCloseConfirmOpen(false);
                  onClose();
                }}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                {t("Leave", "ออก")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
