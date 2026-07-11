/**
 * "เริ่มบทเรียนด้วย AI" dialog (Tier 3.5.E, reworked in 3.5.G) — three tabs:
 * ร่างโครง (outline, inserts at the caret) · เติมเนื้อหา (fill one section,
 * optional detail → styleHint, plus suggested-question cards) ·
 * วางเนื้อหาเดิม (import). Preview-first everywhere (T2); all prose lands
 * through the tiptap-markdown insertContentAt path.
 */
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { Sparkles, X } from "lucide-react";
import { callCreator, type GeneratedQuestion } from "@/lib/creatorApi";
import { useCanvasStore } from "@/stores/canvas.store";
import { useCreatorGradeLevelStore } from "@/stores/creatorGradeLevel.store";
import { useColdStartHint } from "@/hooks/useColdStartHint";
import AiThinkingMessage from "../extensions/AiThinkingMessage";
import MarkdownMessage from "../extensions/MarkdownMessage";
import { useEditorI18n } from "../editor.i18n";
import {
  caretInsertPoint,
  docEndPos,
  formatHeadingOptionLabel,
  formatHeadingBelowOptionLabel,
  formatLessonMarkdownPreview,
  insertMarkdownAt,
  insertOutlineMarkdownAt,
  listHeadings,
  outlineSnapshot,
  sectionEndInsertPos,
  stripLeadingSectionHeading,
} from "./draftHelpers";
import { GRADE_LEVELS } from "./writingAssist";
import { insertGeneratedQuestions } from "./questionInsert";
import QuestionPreviewCard, {
  type PreviewCardStatus,
} from "./QuestionPreviewCard";

const IMPORT_CAP = 20000;

type DraftTab = "outline" | "fill" | "import";

export default function AiDraftDialog({
  editor,
  onClose,
  initialTab = "outline",
}: {
  editor: Editor;
  onClose: () => void;
  initialTab?: DraftTab;
}) {
  const { t } = useEditorI18n();
  const contentId = useCanvasStore((s) => s.contentId);
  const [tab, setTab] = useState<DraftTab>(initialTab);

  // Shared AI-call state (one call at a time per dialog)
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  // Tab 1 — outline
  const [topic, setTopic] = useState("");
  const gradeLevel = useCreatorGradeLevelStore((s) => s.gradeLevel);
  const setGradeLevel = useCreatorGradeLevelStore((s) => s.setGradeLevel);
  const [objectives, setObjectives] = useState("");
  const [outlineDetail, setOutlineDetail] = useState("");
  const [outlineResult, setOutlineResult] = useState<string | null>(null);
  const [outlineInserted, setOutlineInserted] = useState(false);

  // Tab 2 — fill section (headings snapshot at open/tab-switch time)
  const headings = useMemo(
    () => listHeadings(editor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, tab],
  );
  const [headingIndex, setHeadingIndex] = useState(0);
  const [fillDetail, setFillDetail] = useState("");
  const [sectionResult, setSectionResult] = useState<string | null>(null);
  const [sectionInserted, setSectionInserted] = useState(false);
  const [sectionQuestions, setSectionQuestions] = useState<
    GeneratedQuestion[] | null
  >(null);
  const [sectionQStatuses, setSectionQStatuses] = useState<PreviewCardStatus[]>(
    [],
  );
  const [fillLoading, setFillLoading] = useState<"section" | "questions" | null>(
    null,
  );
  const isAiBusy = isLoading || fillLoading !== null;
  const showColdStart = useColdStartHint(isAiBusy);

  // Tab 3 — import
  const [rawText, setRawText] = useState("");
  const [importDetail, setImportDetail] = useState("");
  const [importHeadingIndex, setImportHeadingIndex] = useState(0);
  const [importResult, setImportResult] = useState<{
    markdown: string;
    suggestedQuestions: GeneratedQuestion[];
  } | null>(null);
  const [importInserted, setImportInserted] = useState(false);
  const [questionStatuses, setQuestionStatuses] = useState<PreviewCardStatus[]>(
    [],
  );
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  const hasUnsavedWork =
    isLoading ||
    fillLoading !== null ||
    outlineResult !== null ||
    sectionResult !== null ||
    sectionQuestions !== null ||
    importResult !== null ||
    topic.trim().length > 0 ||
    objectives.trim().length > 0 ||
    outlineDetail.trim().length > 0 ||
    fillDetail.trim().length > 0 ||
    rawText.trim().length > 0 ||
    importDetail.trim().length > 0;

  const requestClose = () => {
    if (!hasUnsavedWork) {
      onClose();
      return;
    }
    setCloseConfirmOpen(true);
  };

  const insertFirstHint = t(
    "Insert the section content below the heading first, then you can add questions.",
    "แทรกเนื้อหาใต้หัวข้อก่อน แล้วค่อยเพิ่มคำถามได้",
  );
  const importContentFirstHint = t(
    "Insert the lesson content first, then you can add questions.",
    "ใส่เนื้อหาลงบทเรียนก่อน แล้วค่อยเพิ่มคำถามได้",
  );

  const guard = async <T,>(call: () => Promise<T>): Promise<T | null> => {
    setIsLoading(true);
    setError(false);
    try {
      return await call();
    } catch {
      setError(true);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleOutline = async () => {
    if (!contentId || !topic.trim() || !gradeLevel) return;
    const result = await guard(() =>
      callCreator(contentId, "outline", {
        topic: topic.trim().slice(0, 200),
        gradeLevel,
        objectives: objectives.trim() ? objectives.trim().slice(0, 1000) : undefined,
        styleHint: outlineDetail.trim() ? outlineDetail.trim().slice(0, 500) : undefined,
      }),
    );
    if (result) {
      setOutlineResult(result.outlineMarkdown);
      setOutlineInserted(false);
    }
  };

  const handleFillSection = async () => {
    const heading = headings[headingIndex];
    if (!contentId || !heading) return;
    setFillLoading("section");
    const result = await guard(() =>
      callCreator(contentId, "draft_section", {
        heading: heading.text.slice(0, 200),
        outlineMarkdown: outlineSnapshot(editor) || undefined,
        styleHint: fillDetail.trim() ? fillDetail.trim().slice(0, 500) : undefined,
      }),
    );
    setFillLoading(null);
    if (result) {
      setSectionResult(
        stripLeadingSectionHeading(result.markdown, heading.text),
      );
      setSectionInserted(false);
      setSectionQuestions(null);
      setSectionQStatuses([]);
    }
  };

  // "เลือกคำถาม" for the fill tab (same preview-card flow the import tab has) —
  // generates from the freshly drafted section text, so it doesn't depend on
  // the autosave cycle having flushed the insert yet.
  const handleSectionQuestions = async () => {
    const heading = headings[headingIndex];
    if (!contentId || !heading || sectionResult === null) return;
    setFillLoading("questions");
    const result = await guard(() =>
      callCreator(contentId, "generate_questions", {
        scope: "selection",
        selectionMarkdown: `## ${heading.text}\n\n${sectionResult}`.slice(
          0,
          12000,
        ),
        types: ["choice", "write"],
        count: 3,
        difficulty: "mixed",
      }),
    );
    setFillLoading(null);
    if (result) {
      setSectionQuestions(result.questions);
      setSectionQStatuses(result.questions.map(() => "pending"));
    }
  };

  const handleImport = async () => {
    if (!contentId || !rawText.trim()) return;
    const result = await guard(() =>
      callCreator(contentId, "import_structure", {
        rawText: rawText.trim().slice(0, IMPORT_CAP),
        styleHint: importDetail.trim()
          ? importDetail.trim().slice(0, 500)
          : undefined,
      }),
    );
    if (result) {
      setImportResult(result);
      setImportInserted(false);
      setQuestionStatuses(result.suggestedQuestions.map(() => "pending"));
    }
  };

  const importInsertPos = () => {
    const currentHeadings = listHeadings(editor);
    if (currentHeadings.length === 0) return docEndPos(editor);
    const idx = Math.min(importHeadingIndex, currentHeadings.length - 1);
    return sectionEndInsertPos(editor, idx, currentHeadings);
  };

  const tabBtn = (key: DraftTab, labelEn: string, labelTh: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
        tab === key
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent"
      }`}
    >
      {t(labelEn, labelTh)}
    </button>
  );

  const loadingLine = (
    <AiThinkingMessage
      coldStart={showColdStart}
      className="text-sm text-muted-foreground"
    />
  );

  const errorLine = error && (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      {t("AI is busy, try again in a moment 🥔", "AI ไม่ว่างแป๊บนึง ลองอีกทีนะ 🥔")}
    </p>
  );

  return createPortal(
    <div
      data-editor-modal
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
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
            {t("Draft the lesson with AI", "เริ่มบทเรียนด้วย AI")}
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

        <div className="flex shrink-0 gap-1 border-b border-border px-3 py-2">
          {tabBtn("outline", "Outline", "ร่างโครง")}
          {tabBtn("fill", "Fill a section", "เติมเนื้อหา")}
          {tabBtn("import", "Import existing", "วางเนื้อหาเดิม")}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {/* ── Tab 1: outline ── */}
          {tab === "outline" && (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-muted-foreground">
                {t("Lesson topic", "หัวข้อบทเรียน")}
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={t(
                    "e.g. Force and motion",
                    "เช่น แรงและการเคลื่อนที่",
                  )}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:ring-1 focus:ring-primary/40"
                />
              </label>
              <div className="flex gap-3">
                <label className="text-xs font-semibold text-muted-foreground">
                  {t("Grade level", "ระดับชั้น")}
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="mt-1 block rounded-md border border-border bg-background px-2 py-1.5 text-sm font-normal text-foreground"
                  >
                    <option value="">{t("Select grade", "เลือกระดับชั้น")}</option>
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex-1 text-xs font-semibold text-muted-foreground">
                  {t("Objectives (optional)", "จุดประสงค์ (ไม่บังคับ)")}
                  <input
                    value={objectives}
                    onChange={(e) => setObjectives(e.target.value)}
                    placeholder={t(
                      "What should students take away?",
                      "อยากให้นักเรียนได้อะไร",
                    )}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-normal outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </label>
              </div>

              <label className="text-xs font-semibold text-muted-foreground">
                {t(
                  "What kind of content? (optional)",
                  "อยากได้เนื้อหาแบบไหน (ไม่บังคับ)",
                )}
                <textarea
                  value={outlineDetail}
                  onChange={(e) =>
                    setOutlineDetail(e.target.value.slice(0, 500))
                  }
                  rows={2}
                  placeholder={t(
                    "e.g. lots of everyday examples, include a mini experiment",
                    "เช่น เน้นตัวอย่างในชีวิตประจำวัน มีการทดลองสั้น ๆ",
                  )}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:ring-1 focus:ring-primary/40"
                />
              </label>

              {errorLine}
              {isLoading && loadingLine}

              {outlineResult !== null && !isLoading && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <MarkdownMessage
                    text={formatLessonMarkdownPreview(outlineResult)}
                    className="text-sm"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleOutline()}
                  disabled={isLoading || !topic.trim() || !gradeLevel || !contentId}
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {outlineResult === null
                    ? t("Draft outline", "ร่างโครง")
                    : t("Draft again", "ร่างใหม่")}
                </button>
                {outlineResult !== null && !outlineInserted && (
                  <button
                    type="button"
                    onClick={() => {
                      insertOutlineMarkdownAt(editor, caretInsertPoint(editor), outlineResult);
                      setOutlineInserted(true);
                    }}
                    className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    {t("Insert into lesson", "แทรกลงบทเรียน")}
                  </button>
                )}
                {outlineInserted && (
                  <span className="flex flex-1 items-center justify-center text-sm text-green-700">
                    {t("Inserted ✓", "แทรกแล้ว ✓")}
                  </span>
                )}
              </div>
              {outlineResult !== null && !outlineInserted && (
                <p className="text-[11px] text-muted-foreground">
                  {t(
                    "The outline is inserted where your cursor is in the lesson.",
                    "โครงจะแทรกตรงตำแหน่งที่เคอร์เซอร์ของครูอยู่ในบทเรียน",
                  )}
                </p>
              )}
            </div>
          )}

          {/* ── Tab 2: fill a section ── */}
          {tab === "fill" && (
            <div className="flex flex-col gap-3">
              {headings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t(
                    "No headings yet — draft an outline first, then come back here.",
                    "ยังไม่มีหัวข้อในบทเรียน — ลองร่างโครงก่อน แล้วค่อยกลับมาเติมเนื้อหานะ",
                  )}
                </p>
              ) : (
                <>
                  <label className="text-xs font-semibold text-muted-foreground">
                    {t("Pick a section", "เลือกหัวข้อที่จะเติม")}
                    <select
                      value={headingIndex}
                      onChange={(e) => {
                        setHeadingIndex(Number(e.target.value));
                        setSectionResult(null);
                        setSectionInserted(false);
                        setSectionQuestions(null);
                        setSectionQStatuses([]);
                        setFillLoading(null);
                      }}
                      className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-normal text-foreground"
                    >
                      {headings.map((h, i) => (
                        <option key={`${h.insertPos}-${i}`} value={i}>
                          {formatHeadingOptionLabel(h)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-semibold text-muted-foreground">
                    {t(
                      "What kind of content? (optional)",
                      "อยากได้เนื้อหาแบบไหน (ไม่บังคับ)",
                    )}
                    <textarea
                      value={fillDetail}
                      onChange={(e) =>
                        setFillDetail(e.target.value.slice(0, 500))
                      }
                      rows={2}
                      placeholder={t(
                        "e.g. lots of everyday examples, include a mini experiment",
                        "เช่น เน้นตัวอย่างในชีวิตประจำวัน มีการทดลองสั้น ๆ",
                      )}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </label>

                  {errorLine}
                  {fillLoading === "section" && loadingLine}

                  {sectionResult !== null && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <p className="mb-2 text-sm font-semibold text-foreground">
                        {formatHeadingOptionLabel(headings[headingIndex])}
                      </p>
                      <MarkdownMessage text={sectionResult} className="text-sm" />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleFillSection()}
                      disabled={
                        isLoading ||
                        !contentId ||
                        (sectionResult !== null && sectionInserted)
                      }
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sectionResult === null
                        ? t("Write this section", "เขียนเนื้อหาส่วนนี้")
                        : t("Write again", "เขียนใหม่")}
                    </button>
                    {sectionResult !== null && !sectionInserted && (
                      <button
                        type="button"
                        onClick={() => {
                          insertMarkdownAt(
                            editor,
                            headings[headingIndex].insertPos,
                            sectionResult,
                          );
                          setSectionInserted(true);
                        }}
                        className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                      >
                        {t("Insert below heading", "แทรกใต้หัวข้อ")}
                      </button>
                    )}
                    {sectionInserted && (
                      <span className="flex flex-1 items-center justify-center text-sm text-green-700">
                        {t("Inserted ✓", "แทรกแล้ว ✓")}
                      </span>
                    )}
                  </div>

                  {/* Suggested questions — only after the section is in the lesson */}
                  {sectionResult !== null && sectionInserted && (
                    <>
                      {fillLoading === "questions" && loadingLine}
                      <button
                        type="button"
                        onClick={() => void handleSectionQuestions()}
                        disabled={isLoading || !contentId}
                        className="flex items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Sparkles size={14} />
                        {sectionQuestions === null
                          ? t(
                              "Suggest questions from this section",
                              "ให้ AI เสนอคำถามจากเนื้อหาส่วนนี้",
                            )
                          : t(
                              "Suggest new questions",
                              "ให้ AI เสนอคำถามใหม่",
                            )}
                      </button>
                    </>
                  )}
                  {sectionResult !== null && !sectionInserted && (
                    <p className="text-[11px] text-muted-foreground">
                      {insertFirstHint}
                    </p>
                  )}
                  {sectionQuestions !== null && (
                    <>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {t("Suggested questions", "คำถามที่ AI เสนอ")}
                      </p>
                      {sectionQuestions.map((q, i) => (
                        <QuestionPreviewCard
                          key={i}
                          question={q}
                          status={sectionQStatuses[i]}
                          addDisabled={!sectionInserted}
                          addDisabledHint={insertFirstHint}
                          onAdd={() => {
                            if (!sectionInserted) return;
                            insertGeneratedQuestions(editor, [q], sectionEndInsertPos(
                              editor,
                              headingIndex,
                              listHeadings(editor),
                            ));
                            setSectionQStatuses((prev) =>
                              prev.map((s, si) => (si === i ? "added" : s)),
                            );
                          }}
                          onDiscard={() =>
                            setSectionQStatuses((prev) =>
                              prev.map((s, si) => (si === i ? "discarded" : s)),
                            )
                          }
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Tab 3: import existing material ── */}
          {tab === "import" && (
            <div className="flex flex-col gap-3">
              {headings.length > 0 && (
                <label className="text-xs font-semibold text-muted-foreground">
                  {t("Where to place it", "ตำแหน่งที่ต้องการจะวาง")}
                  <select
                    value={importHeadingIndex}
                    onChange={(e) => setImportHeadingIndex(Number(e.target.value))}
                    disabled={importInserted}
                    className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-normal text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {headings.map((h, i) => (
                      <option key={`${h.insertPos}-${i}`} value={i}>
                        {formatHeadingBelowOptionLabel(h)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {importResult === null ? (
                <>
                  <label className="text-xs font-semibold text-muted-foreground">
                    {t(
                      "Paste your existing material (old sheets, Word text, ChatGPT output)",
                      "วางเนื้อหาเดิมของครู",
                    )}
                    <textarea
                      value={rawText}
                      onChange={(e) =>
                        setRawText(e.target.value.slice(0, IMPORT_CAP))
                      }
                      rows={8}
                      placeholder={t(
                        "e.g. old worksheet, Word export, or a ChatGPT answer you saved",
                        "เช่น ชีทเก่า ไฟล์ Word หรือที่เคยถาม ChatGPT ไว้",
                      )}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </label>
                  <p className="text-right text-[11px] text-muted-foreground">
                    {rawText.length.toLocaleString()} / {IMPORT_CAP.toLocaleString()}
                  </p>

                  <label className="text-xs font-semibold text-muted-foreground">
                    {t(
                      "What kind of content? (optional)",
                      "อยากได้เนื้อหาแบบไหน (ไม่บังคับ)",
                    )}
                    <textarea
                      value={importDetail}
                      onChange={(e) =>
                        setImportDetail(e.target.value.slice(0, 500))
                      }
                      rows={2}
                      placeholder={t(
                        "e.g. lots of everyday examples, include a mini experiment",
                        "เช่น เน้นตัวอย่างในชีวิตประจำวัน มีการทดลองสั้น ๆ",
                      )}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </label>

                  {errorLine}
                  {isLoading && loadingLine}

                  <button
                    type="button"
                    onClick={() => void handleImport()}
                    disabled={isLoading || !rawText.trim() || !contentId}
                    className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Sparkles size={14} />
                    {t("Restructure into a lesson", "จัดเป็นบทเรียนให้หน่อย")}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Review the structured draft, then insert what you want.",
                      "ตรวจร่างที่จัดแล้ว เลือกใส่เฉพาะส่วนที่ครูต้องการได้เลย",
                    )}
                  </p>
                  <div className="max-h-[min(50vh,520px)] overflow-y-auto rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <MarkdownMessage
                      text={formatLessonMarkdownPreview(importResult.markdown)}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    {!importInserted ? (
                      <button
                        type="button"
                        onClick={() => {
                          insertMarkdownAt(
                            editor,
                            importInsertPos(),
                            importResult.markdown,
                          );
                          setImportInserted(true);
                        }}
                        className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                      >
                        {t("Insert the content", "ใส่เนื้อหาลงบทเรียน")}
                      </button>
                    ) : (
                      <span className="flex flex-1 items-center justify-center text-sm text-green-700">
                        {t("Content inserted ✓", "ใส่เนื้อหาแล้ว ✓")}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setImportResult(null);
                        setImportInserted(false);
                        setQuestionStatuses([]);
                      }}
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent"
                    >
                      {t("Start over", "เริ่มใหม่")}
                    </button>
                  </div>

                  {importResult.suggestedQuestions.length > 0 && (
                    <>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {t("Suggested questions", "คำถามที่ AI เสนอ")}
                      </p>
                      {importResult.suggestedQuestions.map((q, i) => (
                        <QuestionPreviewCard
                          key={i}
                          question={q}
                          status={questionStatuses[i]}
                          addDisabled={!importInserted}
                          addDisabledHint={importContentFirstHint}
                          onAdd={() => {
                            if (!importInserted) return;
                            insertGeneratedQuestions(editor, [q], importInsertPos());
                            setQuestionStatuses((prev) =>
                              prev.map((s, si) => (si === i ? "added" : s)),
                            );
                          }}
                          onDiscard={() =>
                            setQuestionStatuses((prev) =>
                              prev.map((s, si) => (si === i ? "discarded" : s)),
                            )
                          }
                        />
                      ))}
                    </>
                  )}
                </>
              )}
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
                "Your draft and previews will be lost if you leave now.",
                "ร่างและตัวอย่างที่ยังไม่ได้ใส่จะหายไปถ้าออกตอนนี้",
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
    </div>,
    document.body,
  );
}
