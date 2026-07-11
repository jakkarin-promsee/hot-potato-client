/**
 * "ผู้ช่วย AI" hub — the 5th left-sidebar category (Tier 3.5.G UX rework).
 * Every teacher AI tool as a labeled card with a plain-language description,
 * grouped by the authoring workflow (start → write & polish → questions →
 * before publish), so low-tech teachers can see the whole toolbox in one
 * place. Cards open the same dialogs as the header entries — the
 * preview → accept rule is unchanged.
 */
import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  ClipboardCheck,
  ClipboardPaste,
  FileText,
  ListTodo,
  ListTree,
} from "lucide-react";
import type { CriticReport } from "@/lib/creatorApi";
import { useEditorI18n } from "../editor.i18n";
import AiDraftDialog from "./AiDraftDialog";
import AiQuestionDialog from "./AiQuestionDialog";
import { AiCriticDialog } from "./AiCriticButton";
import { AiWritingToolCard } from "./AiWritingAssistant";

type OpenDialog = null | "outline" | "fill" | "import" | "questions" | "critic";

const GroupLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="block px-2 pb-0.5 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
    {children}
  </span>
);

const AiToolCard = ({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="w-full rounded-lg border-2 border-border/90 bg-background/25 px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
  >
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon size={15} strokeWidth={1.9} />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-tight text-foreground">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  </button>
);

export default function AiToolsPanel({ editor }: { editor: Editor }) {
  const { t } = useEditorI18n();
  const [open, setOpen] = useState<OpenDialog>(null);
  // Report cache lives here so closing/reopening the critic doesn't re-spend
  // an AI call (same behavior as the header button's own cache).
  const [criticReport, setCriticReport] = useState<CriticReport | null>(null);

  const close = () => setOpen(null);

  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-2 text-[11px] leading-snug text-muted-foreground">
        {t(
          "Every AI helper in one place — follow the steps top to bottom, or jump to what you need.",
          "เครื่องมือ AI สำหรับครูรวมอยู่ที่นี่ ใช้ตามขั้นตอนบนลงล่าง หรือเลือกเฉพาะที่ต้องการได้เลย",
        )}
      </p>

      <GroupLabel>{t("1 · Start a lesson", "1 · เริ่มบทเรียน")}</GroupLabel>
      <div className="flex flex-col gap-2 px-2">
        <AiToolCard
          icon={ListTree}
          title={t("Draft an outline", "ร่างโครงบทเรียน")}
          description={t(
            "Tell AI the topic — it drafts the headings, inserted right at your cursor.",
            "บอกหัวข้อ แล้ว AI ร่างโครงหัวข้อให้ แทรกตรงตำแหน่งเคอร์เซอร์ของครู",
          )}
          onClick={() => setOpen("outline")}
        />
        <AiToolCard
          icon={ClipboardPaste}
          title={t("Import existing material", "วางเนื้อหาเดิม")}
          description={t(
            "Paste old sheets, Word text, or ChatGPT chats — AI restructures them into a lesson with questions.",
            "วางชีทเก่า ไฟล์ Word หรือแชต ChatGPT แล้ว AI จัดให้เป็นบทเรียนพร้อมคำถาม",
          )}
          onClick={() => setOpen("import")}
        />
      </div>

      <GroupLabel>{t("2 · Write & polish", "2 · เขียนและเกลา")}</GroupLabel>
      <div className="flex flex-col gap-2 px-2">
        <AiToolCard
          icon={FileText}
          title={t("Fill a section", "เติมเนื้อหาในหัวข้อ")}
          description={t(
            "Pick a heading, describe what you want, and AI writes that section — then suggests questions from it.",
            "เลือกหัวข้อ บอกแนวเนื้อหาที่อยากได้ แล้ว AI เขียนให้ พร้อมเสนอคำถามจากเนื้อหานั้นต่อได้",
          )}
          onClick={() => setOpen("fill")}
        />
        <AiWritingToolCard editor={editor} />
      </div>

      <GroupLabel>{t("3 · Questions", "3 · คำถามชวนคิด")}</GroupLabel>
      <div className="flex flex-col gap-2 px-2">
        <AiToolCard
          icon={ListTodo}
          title={t("Generate questions with AI", "สร้างคำถามด้วย AI")}
          description={t(
            "AI drafts critical-thinking questions from the lesson — review each one before adding.",
            "ให้ AI คิดคำถามชวนคิดจากบทเรียน ครูตรวจทีละข้อก่อนเพิ่มลงบทเรียน",
          )}
          onClick={() => setOpen("questions")}
        />
      </div>

      <GroupLabel>{t("4 · Before publishing", "4 · ก่อนเผยแพร่")}</GroupLabel>
      <div className="flex flex-col gap-2 px-2 pb-2">
        <AiToolCard
          icon={ClipboardCheck}
          title={t("Review the lesson", "ตรวจบทเรียน")}
          description={t(
            "AI reads the whole lesson and points out what to improve — it never blocks publishing.",
            "ให้ AI อ่านทั้งบทแล้วบอกจุดที่ปรับได้ ไม่มีผลต่อการกดเผยแพร่",
          )}
          onClick={() => setOpen("critic")}
        />
      </div>

      {(open === "outline" || open === "fill" || open === "import") && (
        <AiDraftDialog editor={editor} onClose={close} initialTab={open} />
      )}
      {open === "questions" && (
        <AiQuestionDialog editor={editor} onClose={close} />
      )}
      {open === "critic" && (
        <AiCriticDialog
          report={criticReport}
          onReport={setCriticReport}
          onClose={close}
        />
      )}
    </div>
  );
}
