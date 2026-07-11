import { ShowcaseShell } from "./components/ShowcaseShell";
import { LEARNING_SCENES } from "./learningScenes";

// /guide/learning — the student walkthrough (ROADMAP-guide.md Tier G3).
export default function LearningShowcase() {
  return (
    <ShowcaseShell
      title={{ th: "เรียนยังไง", en: "How to learn here" }}
      intro={{
        th: "พาใช้ทีละขั้น ตั้งแต่หาบทเรียน ตอบคำถาม จนคุยกับ AI ติวเตอร์ — ทั้งหมดนี้ไม่ต้องสมัครก็ใช้ได้",
        en: "A step-by-step tour: find a lesson, answer questions, chat with the AI tutor — all without an account.",
      }}
      scenes={LEARNING_SCENES}
      finalCta={{
        to: "/explore",
        label: { th: "ไปเลือกบทเรียนเลย", en: "Go pick a lesson" },
        sub: { th: "พร้อมแล้ว ไปลองของจริงกัน", en: "Ready? Go try the real thing" },
      }}
      crossLink={{
        to: "/guide/creating",
        label: { th: "เป็นครูอยากสร้างบทเรียน? → คู่มือครู", en: "A teacher? → Teacher guide" },
      }}
    />
  );
}
