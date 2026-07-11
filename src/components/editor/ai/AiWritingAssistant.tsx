/**
 * "✨ ปรับข้อความ" — selection-based AI writing assistant (Tier 3.5.D,
 * reworked in 3.5.G).
 *
 * Two entry points share one preview dialog:
 * - `AiWritingAssistant` (default): header button. Always clickable — with no
 *   selection it opens a how-to hint instead of being a dead disabled button
 *   (low-tech teachers couldn't discover the select-first flow), and it lights
 *   up solid primary when a selection exists.
 * - `AiWritingToolCard`: card in the left-sidebar AI hub with a live
 *   "selected / not selected" status and the same actions.
 *
 * Still NOT a BubbleMenu — the editor card scales via CSS `zoom`, which makes
 * floating-ui anchor positioning unreliable. Flow: select text → pick an
 * action → before/after preview → ใช้เลย replaces exactly the captured range.
 */
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ChevronDown, Sparkles, X } from "lucide-react";
import { callCreator } from "@/lib/creatorApi";
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

/** Live "is something selected" tracker shared by both entry points. */
function useHasSelection(editor: Editor | null): boolean {
  const [hasSelection, setHasSelection] = useState(false);
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
  return hasSelection;
}

function selectionPreview(text: string, cap = 60): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > cap ? `${flat.slice(0, cap)}…` : flat;
}

/**
 * Before/after preview dialog. Self-contained: runs the AI on mount (except
 * reading_level, which waits for a grade pick), Apply replaces exactly the
 * captured selection range, Cancel leaves the doc untouched.
 */
export function WritingPreviewDialog({
  editor,
  job,
  onClose,
}: {
  editor: Editor;
  job: PendingJob;
  onClose: () => void;
}) {
  const { t } = useEditorI18n();
  const contentId = useCanvasStore((s) => s.contentId);

  const [gradeLevel, setGradeLevel] = useState(GRADE_LEVELS[3]);
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const showColdStart = useColdStartHint(isLoading);

  const runJob = async (grade?: string) => {
    if (!contentId) return;
    setIsLoading(true);
    setError(false);
    setResult(null);
    try {
      const { markdown } = await callCreator(contentId, "proofread", {
        markdown: job.selection.text.slice(0, 12000),
        preset: job.action.preset,
        gradeLevel: job.action.needsGradeLevel ? grade : undefined,
      });
      setResult(markdown);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // reading_level waits for the teacher to pick a grade + press the button
    if (!job.action.needsGradeLevel) void runJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = () => {
    if (result === null) return;
    replaceRangeWithMarkdown(editor, job.selection, result);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
            onClick={onClose}
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
                onClick={() => void runJob(gradeLevel)}
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
                  void runJob(job.action.needsGradeLevel ? gradeLevel : undefined)
                }
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-foreground transition hover:bg-accent"
              >
                {t("Try again", "ลองใหม่")}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent"
            >
              {t("Cancel", "ยกเลิก")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The select-first how-to shown wherever there's no selection yet. */
function SelectFirstHint() {
  const { t } = useEditorI18n();
  return (
    <div className="px-2.5 py-2 text-xs text-muted-foreground">
      <p className="font-semibold text-foreground">
        {t("Not selected yet", "ยังไม่ได้เลือกข้อความ")}
      </p>
      <ol className="mt-1 list-decimal space-y-0.5 pl-4">
        <li>
          {t(
            "Drag over the text you want to improve",
            "ลากคลุมข้อความในบทเรียนที่อยากปรับ",
          )}
        </li>
        <li>
          {t(
            "Come back and pick an action here",
            "กลับมาเลือกเมนูตรงนี้ได้เลย",
          )}
        </li>
      </ol>
    </div>
  );
}

/** Header entry point (kept from 3.5.D, made prominent in 3.5.G). */
export default function AiWritingAssistant({ editor }: { editor: Editor | null }) {
  const { t } = useEditorI18n();
  const contentId = useCanvasStore((s) => s.contentId);
  const hasSelection = useHasSelection(editor);

  const [menuOpen, setMenuOpen] = useState(false);
  const [job, setJob] = useState<PendingJob | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  if (!editor) return null;

  const handlePick = (action: WritingAction) => {
    setMenuOpen(false);
    const selection = getSelectionSnapshot(editor);
    if (!selection) return;
    setJob({ action, selection });
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={!contentId}
          title={
            hasSelection
              ? t("AI writing assistant", "ผู้ช่วยปรับข้อความ")
              : t(
                  "Select some text first",
                  "ลากเลือกข้อความในบทเรียนก่อน แล้วค่อยกดปุ่มนี้",
                )
          }
          className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-30 ${
            hasSelection
              ? "border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
          }`}
        >
          <Sparkles size={14} strokeWidth={2} />
          <span>{t("AI text", "ปรับข้อความ")}</span>
          <ChevronDown size={12} />
        </button>
        {menuOpen && (
          <div className="absolute left-0 top-full z-40 mt-1 w-56 rounded-lg border border-border bg-background p-1 shadow-lg">
            {hasSelection ? (
              WRITING_ACTIONS.map((action) => (
                <button
                  key={action.preset}
                  type="button"
                  onClick={() => handlePick(action)}
                  className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent"
                >
                  {t(action.labelEn, action.labelTh)}
                </button>
              ))
            ) : (
              <SelectFirstHint />
            )}
          </div>
        )}
      </div>

      {job && (
        <WritingPreviewDialog
          editor={editor}
          job={job}
          onClose={() => setJob(null)}
        />
      )}
    </>
  );
}

/**
 * Sidebar-hub entry point (3.5.G): a card with a live selection status so
 * low-tech teachers see the select-first flow instead of having to discover it.
 */
export function AiWritingToolCard({ editor }: { editor: Editor }) {
  const { t } = useEditorI18n();
  const contentId = useCanvasStore((s) => s.contentId);
  const hasSelection = useHasSelection(editor);
  const [job, setJob] = useState<PendingJob | null>(null);

  const snapshot = hasSelection ? getSelectionSnapshot(editor) : null;

  const handlePick = (action: WritingAction) => {
    const selection = getSelectionSnapshot(editor);
    if (!selection) return;
    setJob({ action, selection });
  };

  return (
    <div className="w-full rounded-lg border-2 border-border/90 bg-background/25 px-3 py-2.5">
      <p className="text-[13px] font-semibold leading-tight text-foreground">
        {t("Improve selected text", "ปรับข้อความที่เลือก")}
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
        {t(
          "Fix typos, simplify, shorten, expand, or match a grade level.",
          "แก้คำผิด เกลาให้อ่านง่าย ย่อ ขยาย หรือปรับให้เข้ากับระดับชั้น",
        )}
      </p>

      {snapshot ? (
        <p className="mt-2 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-[11px] text-foreground">
          <span className="font-semibold text-primary">
            {t("Selected:", "เลือกอยู่:")}
          </span>{" "}
          “{selectionPreview(snapshot.text)}”
        </p>
      ) : (
        <div className="mt-2 rounded-md border border-border/70 bg-background/40">
          <SelectFirstHint />
        </div>
      )}

      <div className="mt-2 grid grid-cols-1 gap-1.5">
        {WRITING_ACTIONS.map((action) => (
          <button
            key={action.preset}
            type="button"
            onClick={() => handlePick(action)}
            disabled={!hasSelection || !contentId}
            className="flex items-center gap-2 rounded-md border border-border/80 bg-background/60 px-2.5 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:border-border hover:bg-accent/45 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sparkles size={12} className="shrink-0 text-primary" />
            {t(action.labelEn, action.labelTh)}
          </button>
        ))}
      </div>

      {job && (
        <WritingPreviewDialog
          editor={editor}
          job={job}
          onClose={() => setJob(null)}
        />
      )}
    </div>
  );
}
