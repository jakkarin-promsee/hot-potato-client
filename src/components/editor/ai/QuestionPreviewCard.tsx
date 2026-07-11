import type { GeneratedQuestion } from "@/lib/creatorApi";
import { Check, Plus, Trash2 } from "lucide-react";
import { useEditorI18n } from "../editor.i18n";

export function questionTypeLabel(
  type: GeneratedQuestion["type"],
  t: (en: string, th: string) => string,
): string {
  switch (type) {
    case "choice":
      return t("Multiple choice", "เลือกตอบ");
    case "write":
      return t("Written answer", "เขียนตอบ");
    case "blank_choice":
      return t("Fill blank (choice)", "เติมคำ (ตัวเลือก)");
    case "blank_write":
      return t("Fill blank (write)", "เติมคำ (เขียนตอบ)");
  }
}

function CardBody({ question }: { question: GeneratedQuestion }) {
  const { t } = useEditorI18n();
  if (question.type === "choice") {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{question.question}</p>
        {question.choices.map((c, i) => (
          <p
            key={i}
            className={`text-xs ${
              c.correct ? "font-semibold text-green-700" : "text-muted-foreground"
            }`}
          >
            {c.correct ? "✓" : "○"} {c.text}
          </p>
        ))}
      </div>
    );
  }
  if (question.type === "write") {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{question.question}</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold">{t("Guide answer:", "แนวเฉลย:")}</span>{" "}
          {question.guideAnswer}
        </p>
      </div>
    );
  }
  if (question.type === "blank_choice") {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{question.template}</p>
        <p className="text-xs text-muted-foreground">
          {t("Choices:", "ตัวเลือก:")} {question.choices.join(" / ")}
        </p>
        <p className="text-xs text-green-700">
          {t("Answers:", "คำตอบ:")}{" "}
          {question.correctByBlank
            .map((idx) => question.choices[idx] ?? "?")
            .join(" | ")}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{question.template}</p>
      <p className="text-xs text-green-700">
        {t("Answers:", "คำตอบ:")} {question.blankAnswers.join(" | ")}
      </p>
    </div>
  );
}

export type PreviewCardStatus = "pending" | "added" | "discarded";

export default function QuestionPreviewCard({
  question,
  status,
  onAdd,
  onDiscard,
}: {
  question: GeneratedQuestion;
  status: PreviewCardStatus;
  onAdd: () => void;
  onDiscard: () => void;
}) {
  const { t } = useEditorI18n();
  if (status === "discarded") return null;
  return (
    <div
      className={`rounded-lg border p-3 ${
        status === "added"
          ? "border-green-200 bg-green-50/60"
          : "border-border bg-background"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {questionTypeLabel(question.type, t)}
        </span>
        {status === "added" && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-green-700">
            <Check size={12} /> {t("Added", "เพิ่มแล้ว")}
          </span>
        )}
      </div>
      <CardBody question={question} />
      {status === "pending" && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <Plus size={12} /> {t("Add to lesson", "เพิ่มลงบทเรียน")}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-accent"
          >
            <Trash2 size={12} /> {t("Discard", "ทิ้ง")}
          </button>
        </div>
      )}
    </div>
  );
}
