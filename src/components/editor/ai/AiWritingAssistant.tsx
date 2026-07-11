/**
 * "✨ ปรับข้อความ" — selection-based AI writing assistant (Tier 3.5.D).
 *
 * Lives in the editor header as a dropdown (NOT a BubbleMenu — the editor
 * card scales via CSS `zoom`, which makes floating-ui anchor positioning
 * unreliable, and a visible button is more discoverable for low-tech
 * teachers). Flow: select text → pick an action → before/after preview →
 * ใช้เลย replaces exactly the captured selection range.
 */
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ChevronDown, Sparkles, X } from "lucide-react";
import { callCreator, type ProofreadPreset } from "@/lib/creatorApi";
import { useCanvasStore } from "@/stores/canvas.store";
import { useColdStartHint } from "@/hooks/useColdStartHint";
import MarkdownMessage from "../extensions/MarkdownMessage";
import { useEditorI18n } from "../editor.i18n";
import {
  getSelectionSnapshot,
  GRADE_LEVELS,
  replaceRangeWithMarkdown,
  WRITING_ACTIONS,
  type SelectionSnapshot,
  type WritingAction,
} from "./writingAssist";

interface PendingJob {
  action: WritingAction;
  selection: SelectionSnapshot;
}

export default function AiWritingAssistant({ editor }: { editor: Editor | null }) {
  const { t } = useEditorI18n();
  const contentId = useCanvasStore((s) => s.contentId);

  const [hasSelection, setHasSelection] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [job, setJob] = useState<PendingJob | null>(null);
  const [gradeLevel, setGradeLevel] = useState(GRADE_LEVELS[3]);
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const showColdStart = useColdStartHint(isLoading);

  // Cheap live check (same spirit as the header's undo/redo tracking)
  useEffect(() => {
    if (!editor) return;
    const update = () => setHasSelection(!editor.state.selection.empty);
    update();
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  if (!editor) return null;

  const runJob = async (pending: PendingJob, grade?: string) => {
    if (!contentId) return;
    setIsLoading(true);
    setError(false);
    setResult(null);
    try {
      const { markdown } = await callCreator(contentId, "proofread", {
        markdown: pending.selection.text.slice(0, 12000),
        preset: pending.action.preset as ProofreadPreset,
        gradeLevel: pending.action.needsGradeLevel ? grade : undefined,
      });
      setResult(markdown);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePick = (action: WritingAction) => {
    setMenuOpen(false);
    const selection = getSelectionSnapshot(editor);
    if (!selection) return;
    const pending = { action, selection };
    setJob(pending);
    setResult(null);
    setError(false);
    // reading_level waits for the teacher to pick a grade + press the button
    if (!action.needsGradeLevel) void runJob(pending);
  };

  const closeDialog = () => {
    setJob(null);
    setResult(null);
    setError(false);
    setIsLoading(false);
  };

  const handleApply = () => {
    if (!job || result === null) return;
    replaceRangeWithMarkdown(editor, job.selection, result);
    closeDialog();
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={!hasSelection || !contentId}
          title={
            hasSelection
              ? t("AI writing assistant", "ผู้ช่วยปรับข้อความ")
              : t(
                  "Select some text first",
                  "ลากเลือกข้อความในบทเรียนก่อน แล้วค่อยกดปุ่มนี้",
                )
          }
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <Sparkles size={14} strokeWidth={1.8} />
          <span>{t("AI text", "ปรับข้อความ")}</span>
          <ChevronDown size={12} />
        </button>
        {menuOpen && (
          <div className="absolute left-0 top-full z-40 mt-1 w-52 rounded-lg border border-border bg-background p-1 shadow-lg">
            {WRITING_ACTIONS.map((action) => (
              <button
                key={action.preset}
                type="button"
                onClick={() => handlePick(action)}
                className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent"
              >
                {t(action.labelEn, action.labelTh)}
              </button>
            ))}
          </div>
        )}
      </div>

      {job && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDialog();
          }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 flex max-h-[85vh] w-[92vw] max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles size={15} className="text-primary" />
                {t(job.action.labelEn, job.action.labelTh)}
              </span>
              <button
                type="button"
                onClick={closeDialog}
                aria-label={t("Cancel", "ยกเลิก")}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {job.action.needsGradeLevel && result === null && !isLoading && (
                <div className="mb-3 flex items-end gap-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    {t("Grade level", "ระดับชั้น")}
                    <select
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="mt-1 block rounded-md border border-border bg-background px-2 py-1.5 text-sm font-normal text-foreground"
                    >
                      {GRADE_LEVELS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => void runJob(job, gradeLevel)}
                    className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    {t("Adjust", "ปรับเลย")}
                  </button>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t("Before", "ก่อน")}
                  </p>
                  <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-accent/30 p-3 text-sm text-foreground">
                    {job.selection.text}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t("After", "หลัง")}
                  </p>
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
                    {isLoading ? (
                      <p className="text-muted-foreground">
                        {showColdStart
                          ? t(
                              "Waking the AI up, one sec…",
                              "ปลุก AI แป๊บนึงนะ เซิร์ฟเวอร์เพิ่งตื่น 😴",
                            )
                          : t("Rewriting…", "น้องมันฝรั่งกำลังเกลาให้… 🥔✍️")}
                      </p>
                    ) : error ? (
                      <p className="text-amber-900">
                        {t(
                          "AI is busy, try again 🥔",
                          "AI ไม่ว่างแป๊บนึง ลองอีกทีนะ 🥔",
                        )}
                      </p>
                    ) : result !== null ? (
                      <MarkdownMessage text={result} />
                    ) : (
                      <p className="text-muted-foreground">
                        {t("Waiting…", "รอเริ่ม…")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-3 text-[11px] text-muted-foreground">
                {t(
                  "Bold/colors inside the selection will be re-formatted by the AI's structure.",
                  "การจัดรูปแบบตัวหนา/สีในช่วงที่เลือกจะถูกจัดใหม่ตามผลลัพธ์",
                )}
              </p>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={result === null || isLoading}
                  className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("Apply", "ใช้เลย")}
                </button>
                {error && (
                  <button
                    type="button"
                    onClick={() =>
                      void runJob(
                        job,
                        job.action.needsGradeLevel ? gradeLevel : undefined,
                      )
                    }
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-foreground transition hover:bg-accent"
                  >
                    {t("Try again", "ลองใหม่")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeDialog}
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent"
                >
                  {t("Cancel", "ยกเลิก")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
