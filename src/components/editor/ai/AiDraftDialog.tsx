/**
 * "เริ่มบทเรียนด้วย AI" dialog (Tier 3.5.E) — three tabs:
 * ร่างโครง (outline) · เติมเนื้อหา (fill one section) · วางเนื้อหาเดิม (import).
 * Preview-first everywhere (T2); all prose lands through the tiptap-markdown
 * insertContentAt path.
 */
import { useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Sparkles, X } from "lucide-react";
import { callCreator, type GeneratedQuestion } from "@/lib/creatorApi";
import { useCanvasStore } from "@/stores/canvas.store";
import { useColdStartHint } from "@/hooks/useColdStartHint";
import MarkdownMessage from "../extensions/MarkdownMessage";
import { useEditorI18n } from "../editor.i18n";
import {
  docEndPos,
  insertMarkdownAt,
  listHeadings,
  outlineSnapshot,
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
  const showColdStart = useColdStartHint(isLoading);

  // Tab 1 — outline
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [objectives, setObjectives] = useState("");
  const [outlineResult, setOutlineResult] = useState<string | null>(null);
  const [outlineInserted, setOutlineInserted] = useState(false);

  // Tab 2 — fill section (headings snapshot at open/tab-switch time)
  const headings = useMemo(
    () => listHeadings(editor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, tab],
  );
  const [headingIndex, setHeadingIndex] = useState(0);
  const [sectionResult, setSectionResult] = useState<string | null>(null);
  const [sectionInserted, setSectionInserted] = useState(false);

  // Tab 3 — import
  const [rawText, setRawText] = useState("");
  const [importResult, setImportResult] = useState<{
    markdown: string;
    suggestedQuestions: GeneratedQuestion[];
  } | null>(null);
  const [importInserted, setImportInserted] = useState(false);
  const [questionStatuses, setQuestionStatuses] = useState<PreviewCardStatus[]>(
    [],
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
    if (!contentId || !topic.trim()) return;
    const result = await guard(() =>
      callCreator(contentId, "outline", {
        topic: topic.trim().slice(0, 200),
        gradeLevel: gradeLevel || undefined,
        objectives: objectives.trim() ? objectives.trim().slice(0, 1000) : undefined,
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
    const result = await guard(() =>
      callCreator(contentId, "draft_section", {
        heading: heading.text.slice(0, 200),
        outlineMarkdown: outlineSnapshot(editor) || undefined,
      }),
    );
    if (result) {
      setSectionResult(result.markdown);
      setSectionInserted(false);
    }
  };

  const handleImport = async () => {
    if (!contentId || !rawText.trim()) return;
    const result = await guard(() =>
      callCreator(contentId, "import_structure", {
        rawText: rawText.trim().slice(0, IMPORT_CAP),
      }),
    );
    if (result) {
      setImportResult(result);
      setImportInserted(false);
      setQuestionStatuses(result.suggestedQuestions.map(() => "pending"));
    }
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
    <p className="text-sm text-muted-foreground">
      {showColdStart
        ? t("Waking the AI up, one sec…", "ปลุก AI แป๊บนึงนะ เซิร์ฟเวอร์เพิ่งตื่น 😴")
        : t("Drafting…", "น้องมันฝรั่งกำลังร่างให้… 🥔✍️")}
    </p>
  );

  const errorLine = error && (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      {t("AI is busy, try again in a moment 🥔", "AI ไม่ว่างแป๊บนึง ลองอีกทีนะ 🥔")}
    </p>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 flex max-h-[85vh] w-[92vw] max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles size={15} className="text-primary" />
            {t("Draft the lesson with AI", "เริ่มบทเรียนด้วย AI")}
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

        <div className="flex shrink-0 gap-1 border-b border-border px-3 py-2">
          {tabBtn("outline", "Outline", "ร่างโครง")}
          {tabBtn("fill", "Fill a section", "เติมเนื้อหา")}
          {tabBtn("import", "Import existing", "วางเนื้อหาเดิม")}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
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
                    <option value="">{t("Not set", "ไม่ระบุ")}</option>
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

              {errorLine}
              {isLoading && loadingLine}

              {outlineResult !== null && !isLoading && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <MarkdownMessage text={outlineResult} className="text-sm" />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleOutline()}
                  disabled={isLoading || !topic.trim() || !contentId}
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
                      insertMarkdownAt(editor, 0, outlineResult);
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
                      }}
                      className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-normal text-foreground"
                    >
                      {headings.map((h, i) => (
                        <option key={`${h.insertPos}-${i}`} value={i}>
                          {"–".repeat(Math.max(0, h.level - 1))} {h.text}
                        </option>
                      ))}
                    </select>
                  </label>

                  {errorLine}
                  {isLoading && loadingLine}

                  {sectionResult !== null && !isLoading && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <MarkdownMessage text={sectionResult} className="text-sm" />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleFillSection()}
                      disabled={isLoading || !contentId}
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
                </>
              )}
            </div>
          )}

          {/* ── Tab 3: import existing material ── */}
          {tab === "import" && (
            <div className="flex flex-col gap-3">
              {importResult === null ? (
                <>
                  <label className="text-xs font-semibold text-muted-foreground">
                    {t(
                      "Paste your existing material (old sheets, Word text, ChatGPT output)",
                      "วางเนื้อหาเดิมของครู (ชีทเก่า ไฟล์ Word หรือที่เคยถาม ChatGPT ไว้)",
                    )}
                    <textarea
                      value={rawText}
                      onChange={(e) =>
                        setRawText(e.target.value.slice(0, IMPORT_CAP))
                      }
                      rows={8}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </label>
                  <p className="text-right text-[11px] text-muted-foreground">
                    {rawText.length.toLocaleString()} / {IMPORT_CAP.toLocaleString()}
                  </p>

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
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <MarkdownMessage text={importResult.markdown} className="text-sm" />
                  </div>
                  <div className="flex gap-2">
                    {!importInserted ? (
                      <button
                        type="button"
                        onClick={() => {
                          insertMarkdownAt(
                            editor,
                            docEndPos(editor),
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
                          onAdd={() => {
                            insertGeneratedQuestions(editor, [q]);
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
    </div>
  );
}
