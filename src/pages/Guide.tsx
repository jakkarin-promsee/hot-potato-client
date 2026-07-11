import {
  BookOpen,
  PenSquare,
  Eye,
  Share2,
  Sparkles,
  Brain,
  Bot,
  BarChart3,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  detail: string;
}

const features: Feature[] = [
  {
    icon: PenSquare,
    title: "Visual Lesson Editor",
    description:
      "Create long-form, manga-style lessons with a rich block editor.",
    detail:
      "Drag, drop, and arrange content freely to build intuitive visual narratives. Add images, diagrams, annotations, and flow layouts — all in a single, scrollable canvas designed for storytelling.",
  },
  {
    icon: Eye,
    title: "Immersive Viewer",
    description: "A distraction-free, full-screen reader for deep focus.",
    detail:
      "Students scroll through lessons in a cinema-like experience. The viewer hides all chrome so the content is the only thing that matters. Designed for mobile-first consumption.",
  },
  {
    icon: Brain,
    title: "Critical-Thinking Questions",
    description:
      "Choice, fill-in-the-blank, and open-ended writing blocks with warm AI coaching.",
    detail:
      "Teachers embed questions anywhere in a lesson. Students get coaching on every answer — never a red ✗. The AI admires your thinking first and helps you go deeper.",
  },
  {
    icon: Bot,
    title: "AI Tutor — น้องมันฝรั่ง",
    description:
      "Ask anything about the lesson, anytime, in Thai — no account needed.",
    detail:
      "Suggestion chips guide you when you don't know what to ask. Chat freely about the lesson content. Works fully without logging in; sign in only if you want the tutor to remember you across visits.",
  },
  {
    icon: BookOpen,
    title: "Explore & Discover",
    description: "Browse public lessons from all creators.",
    detail:
      "Bookmark lessons on this device, search by topic, and find inspiration from the community. Bookmarks stay on your phone or browser — no account required.",
  },
  {
    icon: BarChart3,
    title: "Learning History",
    description: "Track every lesson you've viewed, sorted by time.",
    detail:
      "Your personal workspace to revisit and continue where you left off. History is grouped by day so you can see your learning patterns at a glance.",
  },
  {
    icon: Share2,
    title: "Share & Collaborate",
    description: "Publish publicly or keep lessons private.",
    detail:
      "Generate shareable links and invite collaborators. Control visibility per-lesson with simple privacy settings from the publish menu.",
  },
  {
    icon: Sparkles,
    title: "Your AI remembers you",
    description:
      "Logged-in students get continuity across lessons.",
    detail:
      "The tutor remembers your interests and growth areas so coaching feels personal over time. Anonymous users still get the full tutor — just without cross-lesson memory.",
  },
];

export default function Guide() {
  return (
    <div className="pb-24 md:pb-12">
      <div className="container px-4 pt-12 text-center">
        <h1 className="font-serif text-3xl font-bold sm:text-4xl">
          What Intuita can do
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Everything you need to create, share, and learn through visual
          intuition — with an AI tutor in your pocket.
        </p>
      </div>

      <div className="mt-16 space-y-0">
        {features.map((f, i) => {
          const isEven = i % 2 === 0;
          return (
            <section
              key={f.title}
              className={`border-t border-border ${isEven ? "bg-card/50" : "bg-background"}`}
            >
              <div className="container px-4 py-16 md:py-24">
                <div
                  className={`mx-auto flex max-w-3xl flex-col items-center gap-8 md:flex-row ${!isEven ? "md:flex-row-reverse" : ""}`}
                >
                  <div className="flex w-full shrink-0 items-center justify-center md:w-1/2">
                    <div className="flex h-48 w-full max-w-xs items-center justify-center rounded-2xl border border-border text-muted-foreground from-primary/10 via-accent to-card sm:h-56">
                      <f.icon className="h-16 w-16 text-primary/60" />
                    </div>
                  </div>

                  <div className="w-full text-center md:w-1/2 md:text-left">
                    <span className="mb-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h2 className="mt-1 font-serif text-xl font-bold sm:text-2xl">
                      {f.title}
                    </h2>
                    <p className="mt-2 text-sm font-medium text-foreground/80">
                      {f.description}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {f.detail}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="container px-4 py-16 text-center">
        <p className="font-serif text-lg font-semibold">Ready to start?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Jump into Explore or create your first lesson.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link to="/explore">Explore lessons</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/create">I&apos;m a teacher</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
