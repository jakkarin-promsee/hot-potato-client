/**
 * Entry points for the AI draft dialog (Tier 3.5.E):
 * - variant="header": always-available "ร่างบทเรียน" button in EditorHeader.
 * - variant="cta": big "เริ่มบทเรียนด้วย AI ✨" card shown only while the doc
 *   is effectively empty (a brand-new lesson).
 */
import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Sparkles } from "lucide-react";
import { useEditorI18n } from "../editor.i18n";
import AiDraftDialog from "./AiDraftDialog";
import { isDocEffectivelyEmpty } from "./draftHelpers";

export default function AiDraftLauncher({
  editor,
  variant,
}: {
  editor: Editor | null;
  variant: "header" | "cta";
}) {
  const { t } = useEditorI18n();
  const [open, setOpen] = useState(false);
  const [docEmpty, setDocEmpty] = useState(false);

  useEffect(() => {
    if (!editor || variant !== "cta") return;
    const update = () => setDocEmpty(isDocEffectivelyEmpty(editor));
    update();
    editor.on("update", update);
    return () => {
      editor.off("update", update);
    };
  }, [editor, variant]);

  if (!editor) return null;
  if (variant === "cta" && !docEmpty && !open) return null;

  return (
    <>
      {variant === "header" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={t("Draft the lesson with AI", "ให้ AI ช่วยร่างบทเรียน")}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Sparkles size={14} strokeWidth={1.8} />
          <span>{t("Draft lesson", "ร่างบทเรียน")}</span>
        </button>
      ) : (
        docEmpty && (
          <div
            className="mx-auto mb-6 w-full max-w-sm rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-center"
            contentEditable={false}
          >
            <p className="text-sm font-semibold text-foreground">
              {t("Blank page? Let AI help ✨", "หน้าว่างอยู่ใช่ไหม ให้ AI ช่วยเริ่มได้นะ ✨")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                "Draft an outline, or paste your old material and get a structured lesson.",
                "ร่างโครงบทเรียน หรือวางชีทเก่าของครูแล้วให้ AI จัดให้เป็นบทเรียนเลย",
              )}
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <Sparkles size={14} />
              {t("Start with AI", "เริ่มบทเรียนด้วย AI")}
            </button>
          </div>
        )
      )}
      {open && <AiDraftDialog editor={editor} onClose={() => setOpen(false)} />}
    </>
  );
}
