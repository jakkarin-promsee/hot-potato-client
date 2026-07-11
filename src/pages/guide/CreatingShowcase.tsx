import { ShowcaseShell } from "./components/ShowcaseShell";
import { CREATING_SCENES } from "./creatingScenes";

// /guide/creating — the teacher walkthrough (ROADMAP-guide.md Tier G4).
// 10 scenes from plan/guide.md §5, reusing the G3 shell. Desktop screenshots
// (the editor is desktop-only); the page itself still reads fine on a phone.
export default function CreatingShowcase() {
  return (
    <ShowcaseShell
      title={{ th: "สร้างบทเรียนยังไง", en: "How to create lessons" }}
      intro={{
        th: "คู่มือครูฉบับเต็ม — ตั้งแต่หน้าว่างจนเผยแพร่และแชร์ให้นักเรียน (หน้าสร้างใช้บนคอมพิวเตอร์)",
        en: "The full teacher guide — from a blank page to publishing and sharing (the editor is desktop-only).",
      }}
      scenes={CREATING_SCENES}
      finalCta={{
        to: "/create",
        label: { th: "ไปสร้างบทเรียนแรก", en: "Create your first lesson" },
        sub: { th: "พร้อมเริ่มบทเรียนแรกของคุณแล้วใช่ไหม", en: "Ready to start your first lesson?" },
      }}
      crossLink={{
        to: "/guide/learning",
        label: { th: "อยากเห็นมุมนักเรียนก่อน? → คู่มือนักเรียน", en: "See the student side → Student guide" },
      }}
    />
  );
}
