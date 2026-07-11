import { Construction } from "lucide-react";
import { useAppI18n } from "@/lib/i18n";
import { ShowcaseShell } from "./components/ShowcaseShell";

// /guide/creating — the teacher walkthrough (ROADMAP-guide.md Tier G4).
// The 10-scene script is written (plan/guide.md §5); this page ships as a
// friendly placeholder until Tier G4 fills it in.
export default function CreatingShowcase() {
  const { t } = useAppI18n();

  return (
    <ShowcaseShell
      title={{ th: "สร้างบทเรียนยังไง", en: "How to create lessons" }}
      intro={{
        th: "คู่มือครูฉบับเต็ม — ตั้งแต่หน้าว่างจนเผยแพร่และแชร์ให้นักเรียน",
        en: "The full teacher guide — from a blank page to publishing and sharing.",
      }}
      scenes={[]}
      placeholder={
        <div className="container px-4 py-16 text-center">
          <Construction className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-4 font-serif text-lg font-semibold">
            {t("This walkthrough is being written", "คู่มือส่วนนี้กำลังจัดทำอยู่")}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {t(
              "The 10-step teacher tour (writing, questions, the AI copilot, publishing, sharing) is coming soon. Meanwhile, the editor's AI panel walks you through creating a lesson step by step.",
              "ทัวร์สำหรับครู 10 ขั้น (เขียนเนื้อหา สร้างคำถาม ใช้ AI ช่วย เผยแพร่ แชร์) กำลังมาเร็วๆ นี้ ระหว่างนี้ลองกดหมวด AI ในหน้าสร้างบทเรียนได้เลย มีผู้ช่วยพาไปทีละขั้นอยู่แล้ว",
            )}
          </p>
        </div>
      }
      finalCta={{
        to: "/create",
        label: { th: "ไปหน้าสร้างบทเรียน", en: "Open the editor" },
        sub: { th: "เริ่มบทเรียนแรกของคุณได้เลย", en: "Start your first lesson" },
      }}
      crossLink={{
        to: "/guide/learning",
        label: { th: "อยากเห็นมุมนักเรียนก่อน? → คู่มือนักเรียน", en: "See the student side → Student guide" },
      }}
    />
  );
}
