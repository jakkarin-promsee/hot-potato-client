import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Sparkles, Bot, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: BookOpen,
    title: "Manga-style lessons",
    desc: "Long-form visual content that flows naturally, designed for deep understanding.",
  },
  {
    icon: Bot,
    title: "A tutor in your pocket",
    desc: "Ask anything, get warm coaching in Thai — no login needed. น้องมันฝรั่ง guides you with suggestion chips.",
  },
  {
    icon: Sparkles,
    title: "Built for intuition",
    desc: "Not memorization — feel the concepts click through carefully crafted visual storytelling.",
  },
];

const showcaseItems = [
  {
    title: "Understanding Derivatives",
    topics: ["slope", "limit"],
    author: "Ms. Chen",
  },
  {
    title: "How Electricity Works",
    topics: ["current", "voltage"],
    author: "Mr. Park",
  },
  {
    title: "The Logic Behind Recursion",
    topics: ["stack", "base case"],
    author: "Dr. Kim",
  },
  {
    title: "Gravity: A Visual Journey",
    topics: ["force", "mass"],
    author: "Prof. Tanaka",
  },
];

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between px-4">
          <span className="font-serif text-lg font-semibold tracking-tight">
            Intuita
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/explore">Explore</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative container flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="animate-fade-in">
          <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Learning reimagined
          </span>
        </div>

        <h1
          className="animate-fade-in max-w-2xl font-serif text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl"
          style={{ animationDelay: "0.1s" }}
        >
          Learn through
          <br />
          <span className="text-primary">intuition</span>, not memorization
        </h1>

        <p
          className="mt-6 max-w-lg animate-fade-in text-base text-muted-foreground sm:text-lg"
          style={{ animationDelay: "0.2s" }}
        >
          Visual, manga-inspired lessons that help you truly understand. Created
          by teachers who care about how you think.
        </p>

        <div
          className="mt-8 flex animate-fade-in gap-3"
          style={{ animationDelay: "0.3s" }}
        >
          <Button size="lg" asChild>
            <Link to="/explore">
              Start exploring <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/create">I'm a teacher</Link>
          </Button>
        </div>

        <div className="pointer-events-none absolute top-1/3 h-64 w-64 animate-glow-pulse rounded-full bg-primary/10 blur-[120px]" />
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-card/30">
        <div className="container px-4 py-16">
          <h2 className="text-center font-serif text-2xl font-bold">
            How it works
          </h2>
          <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-3">
            {[
              {
                step: "01",
                icon: Eye,
                label: "Browse",
                desc: "Explore visual lessons by topic from talented teachers.",
              },
              {
                step: "02",
                icon: BookOpen,
                label: "Read & Interact",
                desc: "Scroll through manga-style content. Tap, slide, and answer.",
              },
              {
                step: "03",
                icon: Sparkles,
                label: "Build intuition",
                desc: "Feel concepts click — not memorize, truly understand.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="flex flex-col items-center gap-3 text-center"
              >
                <span className="text-xs font-bold text-primary">{s.step}</span>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">{s.label}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content preview */}
      <section className="border-t border-border">
        <div className="container px-4 py-16">
          <h2 className="text-center font-serif text-2xl font-bold">
            What's inside
          </h2>
          <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">
            A glimpse of lessons created by the community.
          </p>
          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {showcaseItems.map((item) => (
              <div
                key={item.title}
                className="overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/30"
              >
                <div className="flex aspect-3/4 items-center justify-center bg-linear-to-br from-primary/15 to-accent">
                  <span className="font-serif text-3xl text-muted-foreground/30">
                    {item.title.charAt(0)}
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-1 text-xs font-medium">
                    {item.title}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.topics.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {item.author}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card/30">
        <div className="container px-4 py-16">
          <div className="mx-auto grid max-w-3xl gap-8 sm:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="animate-slide-up flex flex-col items-center gap-3 text-center sm:items-start sm:text-left"
                style={{ animationDelay: `${0.1 + i * 0.1}s` }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For teachers */}
      <section className="border-t border-border">
        <div className="container flex flex-col items-center px-4 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <h2 className="mt-4 font-serif text-2xl font-bold">For teachers</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Design lessons that make students go "oh, I get it now." Use our
            visual editor to craft manga-style content, publish with one click,
            and track engagement.
          </p>
          <Button className="mt-6" asChild>
            <Link to="/create">
              Start creating <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>Built with care for curious minds.</p>
      </footer>
    </div>
  );
}
