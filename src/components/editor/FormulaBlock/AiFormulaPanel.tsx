/**
 * "ให้ AI เขียนสูตร" panel (Tier 3.5.C) — teachers type the formula the human
 * way (`s = ut + 1/2at^2`) plus a short description; the AI returns
 * KaTeX-compatible LaTeX. The parent writes it through the exact same
 * `persistLatex` path as manual typing, so the rendered preview + editable
 * textarea below IS the accept step (teacher can hand-edit or undo).
 */
import { useState } from "react";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { callCreator } from "@/lib/creatorApi";
import { useCanvasStore } from "@/stores/canvas.store";
import { useEditorI18n } from "../editor.i18n";

export default function AiFormulaPanel({
  onLatex,
  renderFailed,
}: {
  /** Receives the generated LaTeX; parent persists it via persistLatex. */
  onLatex: (latex: string) => void;
  /** True when the current LaTeX fails to render (KaTeX error state). */
  renderFailed: boolean;
}) {
  const { t } = useEditorI18n();
  const contentId = useCanvasStore((s) => s.contentId);

  const [open, setOpen] = useState(false);
  const [formulaText, setFormulaText] = useState("");
  const [description, setDescription] = useState("");
  const [usage, setUsage] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  // Description is required in the UI (it's what disambiguates symbols) even
  // though the API keeps it optional for robustness.
  const canSubmit =
    !!contentId &&
    formulaText.trim().length > 0 &&
    description.trim().length > 0 &&
    !isLoading;

  const handleGenerate = async () => {
    if (!canSubmit || !contentId) return;
    setIsLoading(true);
    setError(false);
    setNote("");
    try {
      const result = await callCreator(contentId, "formula_latex", {
        formulaText: formulaText.trim().slice(0, 300),
        description: description.trim().slice(0, 300),
        usage: usage.trim() ? usage.trim().slice(0, 300) : undefined,
      });
      onLatex(result.latex);
      if (result.note) setNote(result.note);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded border border-violet-200 bg-violet-50/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[11px] font-semibold text-violet-700"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Sparkles size={12} />
        {t("Let AI write the LaTeX", "ให้ AI เขียนสูตร (ไม่ต้องรู้ LaTeX)")}
      </button>

      {open && (
        <div className="flex flex-col gap-2 px-2 pb-2">
          <label className="text-[10px] font-semibold text-violet-700">
            {t("Formula (type it your way)", "สูตร (พิมพ์แบบที่ครูพิมพ์เอง)")}
            <input
              value={formulaText}
              onChange={(e) => setFormulaText(e.target.value)}
              placeholder={t("e.g. s = ut + 1/2at^2", "เช่น s = ut + 1/2at^2")}
              className="mt-1 w-full rounded border border-violet-200 bg-white px-2 py-1.5 font-mono text-xs font-normal text-slate-900 outline-none focus:border-violet-400"
            />
          </label>
          <label className="text-[10px] font-semibold text-violet-700">
            {t("What is it?", "คำอธิบายสั้นๆ")}
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t(
                "e.g. equation of motion",
                "เช่น สมการการเคลื่อนที่",
              )}
              className="mt-1 w-full rounded border border-violet-200 bg-white px-2 py-1.5 text-xs font-normal text-slate-900 outline-none focus:border-violet-400"
            />
          </label>
          <label className="text-[10px] font-semibold text-violet-700">
            {t("Used for (optional)", "ใช้ทำอะไร (ไม่บังคับ)")}
            <input
              value={usage}
              onChange={(e) => setUsage(e.target.value)}
              placeholder={t(
                "e.g. computing distance",
                "เช่น ใช้คำนวณระยะทาง",
              )}
              className="mt-1 w-full rounded border border-violet-200 bg-white px-2 py-1.5 text-xs font-normal text-slate-900 outline-none focus:border-violet-400"
            />
          </label>

          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={!canSubmit}
            className="flex items-center justify-center gap-1.5 rounded bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sparkles size={12} />
            {isLoading
              ? t("Writing…", "กำลังเขียนสูตร…")
              : t("Generate formula", "สร้างสูตร")}
          </button>

          {note && (
            <p className="text-[11px] text-violet-600">
              {t("AI note:", "หมายเหตุจาก AI:")} {note}
            </p>
          )}
          {error && (
            <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
              {t("AI is busy, try again 🥔", "AI ไม่ว่างแป๊บนึง ลองอีกทีนะ 🥔")}
            </p>
          )}
          {renderFailed && (
            <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
              {t(
                "This LaTeX doesn't render — try generating again or edit it below.",
                "สูตรนี้ยังแสดงผลไม่ได้ ลองกดสร้างใหม่ หรือแก้ LaTeX ด้านล่างได้เลย",
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
