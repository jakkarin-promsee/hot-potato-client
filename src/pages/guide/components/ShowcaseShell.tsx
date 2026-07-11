import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useAppI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import type { BilingualText, GuideScene } from "../scenes";
import { SceneSection } from "./SceneSection";

interface ShowcaseShellProps {
  title: BilingualText;
  intro: BilingualText;
  scenes: GuideScene[];
  finalCta: { to: string; label: BilingualText; sub?: BilingualText };
  crossLink: { to: string; label: BilingualText };
  /** Rendered instead of scenes when the walkthrough is not written yet. */
  placeholder?: ReactNode;
}

export function ShowcaseShell({
  title,
  intro,
  scenes,
  finalCta,
  crossLink,
  placeholder,
}: ShowcaseShellProps) {
  const { t } = useAppI18n();
  const { hash } = useLocation();

  // Deep links like /guide/learning#scene-4: the browser's native hash jump
  // fires before this lazy page mounts, so re-run it once the scenes exist.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="pb-24 md:pb-12">
      <div className="container px-4 pt-10 text-center">
        <Link
          to="/guide"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("Guide", "คู่มือ")}
        </Link>
        <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">
          {t(title.en, title.th)}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          {t(intro.en, intro.th)}
        </p>
      </div>

      {scenes.length > 0 && (
        // Numbered TOC chips — sticky so readers can hop between scenes.
        <nav className="sticky top-[var(--app-nav-height,3.5rem)] z-10 mt-8 border-y border-border bg-background/90 backdrop-blur">
          <div className="container flex gap-2 overflow-x-auto px-4 py-2">
            {scenes.map((scene, i) => (
              <a
                key={scene.id}
                href={`#${scene.id}`}
                className="flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground"
              >
                <span className="font-semibold text-primary">{i + 1}</span>
                <span className="max-w-36 truncate">{t(scene.title.en, scene.title.th)}</span>
              </a>
            ))}
          </div>
        </nav>
      )}

      {placeholder ?? (
        <div className="mt-4">
          {scenes.map((scene, i) => (
            <SceneSection key={scene.id} scene={scene} index={i} />
          ))}
        </div>
      )}

      <div className="container border-t border-border px-4 py-16 text-center">
        <p className="font-serif text-lg font-semibold">
          {t(finalCta.sub?.en ?? "Ready?", finalCta.sub?.th ?? "พร้อมแล้วใช่ไหม")}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link to={finalCta.to}>
              {t(finalCta.label.en, finalCta.label.th)}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={crossLink.to}>{t(crossLink.label.en, crossLink.label.th)}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
