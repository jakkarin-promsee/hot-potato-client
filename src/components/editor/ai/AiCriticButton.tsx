/**
 * "✨ ตรวจบทเรียน" — AI lesson review (Tier 3.5.F). Informational only:
 * warm summary first, ✓/✗ checklist, issues grouped by area (info muted /
 * warn amber — no red walls, no scores). NEVER gates the publish button.
 */
import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { Check, ClipboardCheck, Sparkles, X } from "lucide-react";
import { callCreator, type CriticReport } from "@/lib/creatorApi";
import { useCanvasStore } from "@/stores/canvas.store";
import { useColdStartHint } from "@/hooks/useColdStartHint";
import { useEditorI18n } from "../editor.i18n";

const AREA_LABELS: Record<
  CriticReport["issues"][number]["area"],
  { en: string; th: string }
> = {
  accuracy: { en: "Accuracy", th: "ความถูกต้อง" },
  completeness: { en: "Completeness", th: "ความครบถ้วน" },
  readability: { en: "Readability", th: "อ่านง่าย" },
  age_fit: { en: "Age fit", th: "เหมาะกับวัย" },
  questions: { en: "Questions", th: "คำถาม" },
};

export default function AiCriticButton({ editor }: { editor: Editor | null }) {
  const { t } = useEditorI18n();
  const contentId = useCanvasStore((s) => s.contentId);
  const saveContent = useCanvasStore((s) => s.saveContent);
  const isDirty = useCanvasStore((s) => s.isDirty);

  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<CriticReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const showColdStart = useColdStartHint(isLoading);

  const runCritic = async () => {
    if (!contentId) return;
    setIsLoading(true);
    setError(false);
    try {
      // The server reads the saved lesson — flush unsaved edits first so the
      // review matches what's on screen.
      if (isDirty) await saveContent();
      const result = await callCreator(contentId, "critic", {});
      setReport(result);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (!report) void runCritic();
  };

  if (!editor) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title={t("AI lesson review", "ให้ AI ตรวจบทเรียน")}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ClipboardCheck size={14} strokeWidth={1.8} />
        <span>{t("Review", "ตรวจบทเรียน")}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 flex max-h-[85vh] w-[92vw] max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles size={15} className="text-primary" />
                {t("AI lesson review", "ผลตรวจบทเรียนจาก AI")}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("Close", "ปิด")}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">
                  {showColdStart
                    ? t(
                        "Waking the AI up, one sec…",
                        "ปลุก AI แป๊บนึงนะ เซิร์ฟเวอร์เพิ่งตื่น 😴",
                      )
                    : t(
                        "Reading the whole lesson…",
                        "น้องมันฝรั่งกำลังอ่านทั้งบท… 🥔📖",
                      )}
                </p>
              ) : error ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {t(
                    "AI is busy, try again in a moment 🥔",
                    "AI ไม่ว่างแป๊บนึง ลองอีกทีนะ 🥔",
                  )}
                </p>
              ) : report ? (
                <div className="flex flex-col gap-4">
                  {/* Warm summary first */}
                  <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
                    {report.summary}
                  </p>

                  {/* Checklist */}
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                      {t("Checklist", "เช็กลิสต์บทเรียน")}
                    </p>
                    <ul className="space-y-1">
                      {report.checklist.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          {item.pass ? (
                            <Check
                              size={15}
                              className="mt-0.5 shrink-0 text-green-600"
                            />
                          ) : (
                            <span className="mt-0.5 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-muted-foreground/40" />
                          )}
                          <span
                            className={
                              item.pass
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }
                          >
                            {item.item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Issues */}
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                      {t("Suggestions", "จุดที่ปรับได้")}
                    </p>
                    {report.issues.length === 0 ? (
                      <p className="text-sm text-foreground">
                        {t("Looks great! 🎉", "ดูดีมาก! 🎉")}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {report.issues.map((issue, i) => (
                          <div
                            key={i}
                            className={`rounded-lg border p-2.5 text-sm ${
                              issue.severity === "warn"
                                ? "border-amber-200 bg-amber-50"
                                : "border-border bg-accent/20"
                            }`}
                          >
                            <div className="mb-1 flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  issue.severity === "warn"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-accent text-muted-foreground"
                                }`}
                              >
                                {t(
                                  AREA_LABELS[issue.area].en,
                                  AREA_LABELS[issue.area].th,
                                )}
                              </span>
                              {issue.where && (
                                <span className="text-[11px] text-muted-foreground">
                                  {t("At: ", "ในส่วน: ")}
                                  {issue.where}
                                </span>
                              )}
                            </div>
                            <p
                              className={
                                issue.severity === "warn"
                                  ? "text-amber-900"
                                  : "text-foreground"
                              }
                            >
                              {issue.note}
                            </p>
                            {issue.suggestion && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                💡 {issue.suggestion}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void runCritic()}
                    className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent"
                  >
                    {t("Review again", "ตรวจอีกครั้ง")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
