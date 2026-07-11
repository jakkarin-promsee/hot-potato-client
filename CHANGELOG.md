# Changelog — Hot Potato Client

All notable changes to the web app. Format loosely follows [Keep a Changelog](https://keepachangelog.com/). **Nothing is released/deployed yet** — everything sits under `[Unreleased]` until the one-shot launch pass ([`../ROADMAP.md`](../ROADMAP.md) Tier 5).

## [Unreleased]

### Added
- **Streaming AI tutor UX** — token-by-token SSE via `callTutorStream` (raw `fetch`, JSON fallback), safe-markdown rendering (`MarkdownMessage`), tappable suggestion chips, per-card follow-up threads (`FeedbackDiscussionPanel`), deterministic client-side question evaluation (`questionEvaluation.ts`).
- **Six tutor personalities** (`tutorPersonality.store`, persisted) attached to every AI call; **tutor-memory card** on `/profile` (view/erase via `/chat/memory`).
- **Teacher AI copilot hub** in the editor (`components/editor/ai/`) — question generation, guide answers, distractors, formula-from-plain-text, writing assistant, outline/draft/import, lesson critic, publish autofill — all preview→accept via `lib/creatorApi.ts`.
- **Google Sign-In** button (`@react-oauth/google`) on `/login`; hidden when `VITE_GOOGLE_CLIENT_ID` is unset.
- **SEO/OG** meta tags + `robots.txt`; **route-level code splitting** (entry ~138 kB gzip, was 648) with `manualChunks`; **self-hosted fonts** (`@fontsource`, no CDN).
- **Settings/Profile completeness** — app-wide font-size control (`appearance.store`), Help popup, real profile page.
- **Bilingual UI** (`language.store` + `useAppI18n`); **Status page v2** (AI health + recent errors); **guide showcases** (`/guide/learning`, `/guide/creating`, Playwright-generated screenshots).

### Changed
- All AI surfaces now call the single server endpoint `/api/chat/tutor` through `tutorApi.ts` (legacy `questionFeedbackApi.ts` removed); the client no longer serializes lesson text.
- Viewer zoom switched from `transform: scale()` to CSS `zoom` (fixes the double-scrollbar bug).
- Structured-401 auto-logout handling in `lib/axios.ts`.

### Removed
- Dead `components/design/*`, the duplicated `Cloudinaryupload` body, CDN font `@import`s.

---

_When the first deploy happens, cut a `[1.0.0]` release from `[Unreleased]` with the date._
