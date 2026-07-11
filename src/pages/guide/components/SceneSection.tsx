import { Link } from "react-router-dom";
import { ArrowRight, Lightbulb } from "lucide-react";
import { useAppI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import type { GuideScene } from "../scenes";
import { SceneImage } from "./SceneImage";

export function SceneSection({ scene, index }: { scene: GuideScene; index: number }) {
  const { t } = useAppI18n();
  const isEven = index % 2 === 0;

  return (
    <section
      id={scene.id}
      // scroll-mt clears the sticky TopNav + TOC when jumping via anchors
      className={`scroll-mt-28 border-t border-border ${isEven ? "bg-card/50" : "bg-background"}`}
    >
      <div className="container px-4 py-12 md:py-16">
        <div
          className={`mx-auto flex max-w-3xl flex-col items-center gap-8 md:flex-row md:items-start ${
            !isEven ? "md:flex-row-reverse" : ""
          }`}
        >
          <div className="flex w-full shrink-0 flex-col items-center gap-4 md:w-1/2">
            {scene.images.map((img) => (
              <SceneImage key={img.file} image={img} />
            ))}
          </div>

          <div className="w-full md:w-1/2">
            <span className="mb-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h2 className="mt-1 font-serif text-xl font-bold sm:text-2xl">
              {t(scene.title.en, scene.title.th)}
            </h2>

            <ol className="mt-4 space-y-3">
              {scene.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-foreground/90">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span>{t(step.en, step.th)}</span>
                </li>
              ))}
            </ol>

            {scene.tip && (
              <div className="mt-4 flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground/80">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>{t(scene.tip.en, scene.tip.th)}</span>
              </div>
            )}

            {scene.cta && (
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to={scene.cta.to}>
                  {t(scene.cta.label.en, scene.cta.label.th)}
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
