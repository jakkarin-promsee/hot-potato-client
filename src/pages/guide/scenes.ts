// Shared types for the guide showcase pages. Scenes are data, not JSX, so copy
// edits never touch layout and tests can pin scene counts/ids (plan/guide.md §7).

export interface BilingualText {
  en: string;
  th: string;
}

export interface SceneImageRef {
  /** Filename inside client/public/guide/ (e.g. "learning-01-landing.webp"). */
  file: string;
  alt: BilingualText;
}

export interface GuideScene {
  /** Stable anchor id, e.g. "scene-1" — used for the TOC and future deep links. */
  id: string;
  title: BilingualText;
  steps: BilingualText[];
  tip?: BilingualText;
  images: SceneImageRef[];
  cta?: { to: string; label: BilingualText };
}
