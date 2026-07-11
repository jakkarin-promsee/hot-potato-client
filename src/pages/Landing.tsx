import { Link } from "react-router-dom";
import {
  ArrowRight,
  Compass,
  GraduationCap,
  PenSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppI18n } from "@/lib/i18n";
import { OWNER_FACEBOOK_URL } from "@/lib/contact";

// / — the single front door (2026-07-11: Landing and the /guide hub merged;
// /guide now redirects here). Hero pitch → role cards routing to the two
// showcase walkthroughs → contact footer. Renders inside AppLayout, so TopNav
// provides login/language/theme — no page-local header.

interface RoleCard {
  to: string;
  icon: React.ElementType;
  title: { en: string; th: string };
  description: { en: string; th: string };
  badge?: { en: string; th: string };
  cta: { en: string; th: string };
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
    cta: { th: "เปิดคู่มือ", en: "Open the guide" },
  },
  {
    to: "/guide/creating",
    icon: PenSquare,
    title: { th: "ฉันเป็นครู", en: "I'm a teacher" },
    description: {
      th: "สร้างบทเรียนยังไง: เขียนเนื้อหา แทรกคำถาม ให้ AI ช่วย แล้วเผยแพร่และแชร์ให้นักเรียน",
      en: "How to create: write content, embed questions, lean on the AI copilot, then publish and share.",
    },
    badge: { th: "10 ขั้นตอน", en: "10 steps" },
    cta: { th: "เปิดคู่มือ", en: "Open the guide" },
  },
  {
    to: "/explore",
    icon: Compass,
    title: { th: "ไม่อ่านคู่มือละ ขอลองเลย", en: "Skip the manual — let me try" },
    description: {
      th: "เข้าหน้าสำรวจ เปิดบทเรียนไหนก็ได้ แล้วลองกดปุ่ม Ask AI ดู",
      en: "Jump into Explore, open any lesson, and try the Ask AI button.",
    },
    cta: { th: "ไปหน้าสำรวจ", en: "Go explore" },
  },
];

export default function Landing() {
  const { t, isThai } = useAppI18n();

  return (
    <div className="pb-24 md:pb-12">
      {/* Hero */}
      <section className="relative container flex flex-col items-center px-4 pt-16 pb-4 text-center">
        <h1
          className="animate-fade-in max-w-2xl font-serif text-4xl font-bold leading-tight tracking-tight sm:text-5xl"
          style={{ animationDelay: "0.1s" }}
        >
          {isThai ? (
            <>
              เรียนรู้อย่าง<span className="text-primary">เข้าใจ</span>
              <br />
              กับติวเตอร์ AI ใจดี
            </>
          ) : (
            <>
              Learn through <span className="text-primary">understanding</span>
              <br />
              with a kind AI tutor
            </>
          )}
        </h1>

        <p
          className="mt-6 max-w-lg animate-fade-in text-base text-muted-foreground sm:text-lg"
          style={{ animationDelay: "0.2s" }}
        >
          {t(
            "Teachers craft lessons with think-questions. You read, answer, and ask the AI anything — free, no account needed.",
            "คุณครูสร้างบทเรียนพร้อมคำถามชวนคิด ส่วนคุณอ่าน ตอบ และถาม AI ได้ทุกเรื่องที่สงสัย — ฟรี ไม่ต้องสมัครสมาชิก",
          )}
        </p>

        <div
          className="mt-8 animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <Button size="lg" asChild>
            <Link to="/explore">
              {t("Start exploring", "เริ่มสำรวจเลย")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="pointer-events-none absolute top-1/3 h-64 w-64 animate-glow-pulse rounded-full bg-primary/10 blur-[120px]" />
      </section>

      {/* Pick your path (the former /guide hub) */}
      <section className="container mt-12 px-4">
        <div className="text-center">
          <h2 className="font-serif text-2xl font-bold">
            {t("New here? Pick your path", "มาใหม่? เลือกเส้นทางของคุณ")}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {t(
              "We'll walk you through step by step, with pictures.",
              "เดี๋ยวพาไปทีละขั้น พร้อมรูปประกอบทุกจุด",
            )}
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
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
              <h3 className="mt-4 font-serif text-lg font-bold">
                {t(card.title.en, card.title.th)}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {t(card.description.en, card.description.th)}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                {t(card.cta.en, card.cta.th)}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer (contact + status, carried over from the hub) */}
      <footer className="container mt-14 border-t border-border px-4 pt-8 text-center text-sm text-muted-foreground">
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
        <p className="mt-3 text-xs">
          {t(
            "Built with care for curious minds.",
            "ตั้งใจทำเพื่อคนอยากรู้อยากเห็นทุกคน",
          )}
        </p>
      </footer>
    </div>
  );
}
