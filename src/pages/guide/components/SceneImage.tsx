import { useAppI18n } from "@/lib/i18n";
import { GUIDE_IMAGES } from "../guideImages";
import type { SceneImageRef } from "../scenes";

// Guide screenshots are static assets in client/public/guide/ (never imported —
// keeps them out of every JS chunk; see ROADMAP-guide.md §11 bundle budget).
export function SceneImage({ image }: { image: SceneImageRef }) {
  const { t } = useAppI18n();
  const dims = GUIDE_IMAGES[image.file];
  // Landscape shots (the teacher editor) get more width; portrait phone/element
  // shots stay narrow so they don't blow up. Falls back to narrow if unknown.
  const landscape = dims ? dims.width > dims.height : false;

  return (
    <img
      src={`/guide/${image.file}`}
      alt={t(image.alt.en, image.alt.th)}
      loading="lazy"
      width={dims?.width}
      height={dims?.height}
      className={`w-full rounded-xl border border-border bg-card shadow-sm ${
        landscape ? "max-w-2xl" : "max-w-sm"
      }`}
    />
  );
}
