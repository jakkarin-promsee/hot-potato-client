import { Link } from "react-router-dom";
import {
  ArrowRight,
  Compass,
  GraduationCap,
  HeartPulse,
  MessageCircle,
  PenSquare,
} from "lucide-react";
import { useAppI18n } from "@/lib/i18n";
import { OWNER_FACEBOOK_URL } from "@/lib/contact";
import { BRAND_NAME } from "@/lib/brand";

// /guide — the guide hub (ROADMAP-guide.md Tier G2). Routes readers to the two
// showcase walkthroughs by role, plus a straight-to-Explore shortcut.

interface RoleCard {
  to: string;
  icon: React.ElementType;
  title: { en: string; th: string };
  description: { en: string; th: string };
  badge?: { en: string; th: string };
}

const ROLE_CARDS: RoleCard[] = [
  {
    to: "/guide/learning",
    icon: GraduationCap,
    title: { th: "ฉันเป็นนักเรียน", en: "I'm a student" },
    description: {
      th: "เรียนยังไง: หาบทเรียน ตอบคำถามชวนคิด คุยกับ AI ติวเตอร์ — ไม่ต้องสมัครก็ใช้ได้ครบ",
      en: "How to learn: find lessons, answer think-questions, chat with the AI tutor — no account needed.",
    },
    badge: { th: "9 ขั้นตอน", en: "9 steps" },
  },
  {
    to: "/guide/creating",
    icon: PenSquare,
    title: { th: "ฉันเป็นครู", en: "I'm a teacher" },
    description: {
      th: "สร้างบทเรียนยังไง: เขียนเนื้อหา แทรกคำถาม ให้ AI ช่วย แล้วเผยแพร่และแชร์ให้นักเรียน",
      en: "How to create: write content, embed questions, lean on the AI copilot, then publish and share.",
    },
    badge: { th: "กำลังจัดทำ", en: "in progress" },
  },
  {
    to: "/explore",
    icon: Compass,
    title: { th: "ไม่อ่านคู่มือละ ขอลองเลย", en: "Skip the manual — let me try" },
    description: {
      th: "เข้าหน้าสำรวจ เปิดบทเรียนไหนก็ได้ แล้วลองกดปุ่ม Ask AI ดู",
      en: "Jump into Explore, open any lesson, and try the Ask AI button.",
    },
  },
];

export default function Guide() {
  const { t } = useAppI18n();

  return (
    <div className="pb-24 md:pb-12">
      <div className="container px-4 pt-12 text-center">
        <h1 className="font-serif text-3xl font-bold sm:text-4xl">
          {t("How to use " + BRAND_NAME, "คู่มือการใช้งาน")}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          {t(
            "Pick your path — we'll walk you through step by step, with pictures.",
            "เลือกเส้นทางของคุณ แล้วเราจะพาไปทีละขั้น พร้อมรูปประกอบทุกจุด",
          )}
        </p>
      </div>

      <div className="container mt-10 px-4">
        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          {ROLE_CARDS.map((card, i) => (
            <Link
              key={card.to}
              to={card.to}
              className={`group rounded-2xl border border-border bg-card/50 p-6 transition-colors hover:border-primary/50 hover:bg-card ${
                i === 2 ? "sm:col-span-2" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <card.icon className="h-5 w-5 text-primary" />
                </div>
                {card.badge && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {t(card.badge.en, card.badge.th)}
                  </span>
                )}
              </div>
              <h2 className="mt-4 font-serif text-lg font-bold">
                {t(card.title.en, card.title.th)}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {t(card.description.en, card.description.th)}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                {t("Open the guide", "เปิดคู่มือ")}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="container mt-12 px-4 text-center text-sm text-muted-foreground">
        <p>
          {t("Something broken or confusing?", "เจออะไรพังหรืองงตรงไหน?")}{" "}
          <a
            href={OWNER_FACEBOOK_URL}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            {t("Message the maker", "ทักหาคนทำเว็บ")}
          </a>
          {" · "}
          <Link to="/status" className="font-medium text-primary hover:underline">
            {t("Check system status", "เช็กสถานะระบบ")}
          </Link>
        </p>
      </div>
    </div>
  );
}
