# CLAUDE.md — Hot Potato Client

The web app for Hot Potato: where teachers author lessons and students learn. Read the root [`../CLAUDE.md`](../CLAUDE.md) first for cross-cutting context, and [`../server/CLAUDE.md`](../server/CLAUDE.md) for the API it talks to.

## Stack

- **React 19** + **TypeScript**, bundled by **Vite 7**.
- **Tailwind CSS v4** (via `@tailwindcss/vite`) + **shadcn/ui** (Radix primitives, `class-variance-authority`, `clsx`, `tailwind-merge`).
- **State:** Zustand (global stores) + TanStack Query (server state for some flows).
- **Routing:** React Router 7.
- **HTTP:** axios (single configured instance).
- **Editor:** TipTap 3 (rich text) + Fabric.js 7 (canvas) + KaTeX (math).
- **Media:** Cloudinary (image upload/library).
- **Icons/UI:** lucide-react, sonner (toasts).
- **Deploy:** Vercel (SPA rewrite in `vercel.json`).

## Commands

```bash
npm install
npm run dev        # vite dev server → http://localhost:5173
npm run build      # vite build → dist/
npm run preview    # preview the production build
npm run lint       # eslint
npm test           # vitest run
```

**Tests:** Vitest + happy-dom. Config in `client/vitest.config.ts` (re-declares the `@` alias). Tests live next to the code they cover:

```
client/src/components/editor/extensions/__tests__/   # tutor + editor unit tests
client/src/stores/__tests__/                       # profile.store, bookmark.store
client/src/lib/__tests__/                          # axios helpers (isProtectedPath, buildForcedLoginUrl)
client/src/pages/__tests__/                        # Profile, Login, Dashboard
client/src/components/__tests__/                   # guards, TopNav
```

**Working agreement:** every later phase ships tests for its own acceptance criteria; you're not done until `npm test` is green.

## Conventions

- **Path alias `@` → `src/`** (configured in `vite.config.js` and `tsconfig.json`). Import as `@/components/...`, `@/stores/...`, `@/lib/...`.
- **shadcn/ui** components live in `src/components/ui/` (config in `components.json`). Add new ones with the shadcn CLI; don't hand-edit generated primitives unless necessary. Compose with the `cn()` helper from `@/lib/utils`.
- **Tailwind v4** — configuration is CSS-first (see `src/index.css`); there is no `tailwind.config.js`. Editor-specific styles live in `src/indexTiptap.css` (imported from editor/viewer components, not `main.tsx`).
- **Fonts (Tier 2.B):** fully self-hosted via `@fontsource` in `index.css` — **Geist Variable** = UI sans (`--font-sans`), **Lora** = serif headings (`font-serif`), **JetBrains Mono** = mono (`font-mono`, Status page), **Inter** = Fabric canvas text only (family name `"Inter"` is baked into saved lesson JSON — never rename). No CDN fonts (`fonts.googleapis.com` / `gstatic`); enforced by `src/__tests__/no-cdn-fonts.test.ts`. DM Sans was removed (loaded but unused). Thai text still falls back to system fonts.
- File naming: pages `PascalCase.tsx`, stores `*.store.ts`, hooks `useX.ts`, libs `camelCase.ts`.
- The app currently mixes English and Thai in UI strings; AI responses are Thai by default. Keep user-facing copy consistent with nearby code.

## Directory map

```
client/src/
├── App.tsx              # router + route guards (the page map)
├── main.tsx            # React root
├── index.css           # Tailwind v4 entry + theme tokens
├── indexTiptap.css     # editor/TipTap styles
├── pages/              # one component per route
├── layouts/            # AppLayout (shared chrome via <Outlet/>)
├── components/
│   ├── ui/             # shadcn/ui primitives
│   ├── editor/         # the lesson editor (TipTap + Fabric + question blocks)
│   └── *.tsx           # TopNav, ContentCard, route guards, ThemeToggle, etc.
├── stores/             # Zustand global state
├── hooks/              # useFabric, useFabricSetup, useCanvasDrag
├── contexts/           # CanvasContext (UI pointer to active Fabric canvas)
├── lib/                # axios, cloudinary, formatting, utils
└── types/              # shared TS types
```

## Routing & page map

Defined in `App.tsx` with three guard components. `BrowserRouter` + `QueryClientProvider` wrap everything. On mount, if a persisted token exists, `recheckToken()` re-validates it.

**Code splitting (Tier 2.A):** all pages except `Landing` and `NotFound` are `React.lazy` imports inside a single `<Suspense fallback={<PageLoader />}>`. Heavy vendor libs are pinned in `vite.config.js` `manualChunks` (`tiptap`, `fabric`, `katex`) so they load only on editor/viewer routes and cache across deploys. `main.tsx` listens for `vite:preloadError` and reloads once after a redeploy (stale chunk hashes). Editor-only CSS (`indexTiptap.css`) is imported from `TipTapEditor.tsx` / `TiptapViewer.tsx`, not `main.tsx`.

| Path | Page | Guard | Notes |
| --- | --- | --- | --- |
| `/` | `Landing` | — | **Home = landing + guide hub merged (2026-07-11):** hero pitch (bilingual, `BRAND_NAME`) + role cards → the two showcases + contact footer. Eager import; inside `AppLayout` |
| `/login` | `Login` | `PublicRoute` | Redirects away if already logged in. Also hosts **Google sign-in** (2026-07-11): `@react-oauth/google` button (bilingual, mode-aware) → `auth.store.loginWithGoogle` → `POST /auth/google`; hidden when `VITE_GOOGLE_CLIENT_ID` is unset |
| `/explore` | `Explore` | — | Browse public lessons |
| `/guide` | — | — | Redirect → `/` (`Navigate replace`; the Tier G2 hub was merged into Landing 2026-07-11) |
| `/guide/learning` | `guide/LearningShowcase` | — | Student walkthrough — 9 screenshot scenes (Tier G3) |
| `/guide/creating` | `guide/CreatingShowcase` | — | Teacher walkthrough — 10 screenshot scenes (Tier G4) |
| `/dashboard` | `Dashboard` | `ProtectedRoute` | Creator's lessons |
| `/create` | `Create` | `ProtectedRoute` | Start a new lesson |
| `/canvas/:id` | `TipTapCanvas` | `ProtectedRoute` | **The lesson editor** |
| `/view/:id` | `TiptapView` | — | Public read-only lesson viewer (API uses optionalAuth) |
| `/history` | `History` | `RequireLogin` | Recently opened lessons |
| `/profile` | `Profile` | `RequireLogin` | Account — loads/saves via `GET/PUT /users/me/profile` (Tier 2.A) + tutor-memory card & personality shortcut (Tier 3.B) |
| `/change-password` | `ChangePassword` | `RequireLogin` | Security |
| `/settings` | `Setting` | — | Settings (public; cleaned in Tier 3.A — theme, language, font size, personality, help popup; account rows only when logged in) |
| `/uploadimage` | `Cloudinaryupload` | `ProtectedRoute` | Image upload tool |
| `/status` | `Status` | — | System status (v2: AI health + recent errors cards, bilingual) |
| `*` | `NotFound` | — | 404 |

Routes under `/` and `/login … /settings` render inside `AppLayout` (shared nav chrome — TopNav's first item is "หน้าแรก" → `/`). The three guards:

- **`ProtectedRoute`** — hard gate; redirects unauthenticated users to `/login` with `state.from` for redirect-back (Tier 2.B).
- **`RequireLogin`** — soft gate; renders an inline "please sign in" prompt (with `title`/`description` props) instead of redirecting. The login link carries `state.from`.
- **`PublicRoute`** — for auth-only-when-logged-out pages (e.g. `/login`); bounces authenticated users to `redirect` query param or `/explore`.

## State management (Zustand)

Global stores in `src/stores/`. Each is a `create()` store; some use the `persist` middleware (localStorage).

| Store | Responsibility |
| --- | --- |
| `auth.store` | `user` + `token` (**persisted** as `auth-storage`), `login` / `loginWithGoogle` / `register` / `recheckToken` / `logout` |
| `profile.store` | Account profile (`GET/PUT /users/me/profile`); syncs `auth.store` on name change |
| `bookmark.store` | Device-local lesson bookmarks (**persisted** as `bookmark-storage`) |
| `content.store` | The current lesson document (load / create / update / delete via API) |
| `content-answer.store` | The student's answers for the current lesson (load / save / bulk-save) |
| `learningHistory.store` | Recently visited lessons |
| `category.store` | Image-library categories |
| `cloudinary.store` | Image upload / library state |
| `canvas.store` | Canvas-related UI state + `agentSettings` for publish modal (Tier 1.B) |
| `tutorPersonality.store` | Student tutor preset id (**persisted** as `tutor-personality-storage`); auto-attached on every `/chat/tutor` call |
| `creatorGradeLevel.store` | Teacher's last picked grade level for creator AI (**persisted** as `creator-grade-level`); shared by outline, question generator, and writing assistant |
| `language.store` | UI language (Thai / English) |
| `theme.store` | Light / dark theme |
| `appearance.store` | App-wide font size (`small…xlarge`; persisted as `app-font-size`); applies `%` to `document.documentElement.style.fontSize` at module load — imported in `main.tsx` so it runs on every route. Separate mechanism from the viewer's CSS `zoom`; never merge them. |
| `tutorMemory.store` | Student's tutor memory (`GET/DELETE /chat/memory`); normalizes the raw StudentMemory doc and strips internal fields (`tutor_personality`, ids, timestamps) |
| `status.store` | System-status page data |

`auth.store` is the source of truth for the token; `lib/axios.ts` reads it directly (outside React) to attach the `Bearer` header.

## Data fetching & API contract

`src/lib/axios.ts` exports a single configured `api` instance — **use it for all API calls** (don't create new axios instances):

- `baseURL = import.meta.env.VITE_API_URL`.
- **Request interceptor** attaches `Authorization: Bearer <token>` from `auth.store`.
- **Response interceptor** watches for the server's structured 401 (`forceRelogin` / `clearToken`, see [`../server/CLAUDE.md`](../server/CLAUDE.md)). On such a 401 it logs out and — only for protected paths — redirects to `/login?reason=...&code=...&redirect=...` via `buildForcedLoginUrl`. `Login` reads `state.from`, `redirect`, and shows a calm Thai banner from `code`. Pass `{ skipAuthRedirect: true }` on a request to opt out (e.g. `recheckToken` does this). Exported helpers: `isProtectedPath`, `isSafeRedirectTarget`, `buildForcedLoginUrl`.

TanStack Query (`QueryClient` in `App.tsx`) is available for server-state caching; usage is partial — match whatever the page you're editing already does (store-driven vs. query-driven).

## The lesson editor (the heart of the app)

Lives in `src/components/editor/`. It is a **TipTap** document with custom node types, plus **Fabric.js** canvases embedded as nodes. **The canonical deep-dive is [`src/components/README.md`](src/components/README.md)** — read it before changing editor internals. Key principle from that doc:

> **The TipTap node is the single source of truth.** All canvas data lives in the node's attributes — not in context, not in a hook. `CanvasContext` is only a *UI pointer* to whichever Fabric canvas is currently active, so the toolbar can reach it without prop drilling.

### Extensions / node types

Configured in `editor/config/editorExtensions.ts` (`createEditorExtensions(editable)`):

- **Standard:** StarterKit (headings 1–3, lists, etc.), Link, Markdown, TextAlign, Underline, TextStyle, Color, Highlight, Table (+row/header/cell), TaskList/TaskItem, Youtube, Placeholder (editable only).
- **Custom nodes:**
  - `ResizableImage` — images (resizable in editor).
  - `FabricCanvasNode` — an embedded Fabric.js drawing/design canvas. Paired with `FabricCanvasView` + `useFabric` / `useFabricSetup` / `useCanvasDrag`.
  - `FormulaBlockNode` (`editor/FormulaBlock/`) — visual math builder; serializes to LaTeX (`formulaToLatex.ts`), rendered with KaTeX.
  - **Question nodes** (the critical-thinking system):

| Node | Question type |
| --- | --- |
| `QuestionChoiceNode` | Multiple choice |
| `QuestionWriteNode` | Open-ended written answer (graded by AI write-evaluate) |
| `QuestionBlankChoiceNode` | Fill-in-the-blank, choose from options |
| `QuestionBlankWriteNode` | Fill-in-the-blank, type the answer |
| `QuestionAgentNode` | Embedded AI tutor block — the student's *free questioning* of the lesson |

Each `*Node.ts` defines the TipTap node (schema/attrs); each `*View.tsx` is its React render. `SearchHighlight` adds in-document search highlighting.

### The teacher AI copilot (Tier 3.5, editor-only)

`src/lib/creatorApi.ts` is the **single creator bridge** — a typed `callCreator(contentId, action, payload)` over `POST /api/creator/assist` (plain axios, JSON-only, no SSE; throws `CreatorAiError` with a machine code). All copilot UI lives in `components/editor/ai/` and stays inside the lazy editor chunk:

| Surface | Where | Action(s) |
| --- | --- | --- |
| `AiToolsPanel` | **The AI hub (3.5.G):** 5th left-sidebar category "AI" (leads the rail, primary-tinted) — every tool below as a card with a Thai/English description, grouped by workflow (เริ่มบทเรียน → เขียนและเกลา → คำถาม → ก่อนเผยแพร่). Opens the same dialogs as the header entries. | — (hub only) |
| `AiQuestionDialog` | Question panel in `EditorLeftSidebar` + AI hub card | `generate_questions` → preview cards → real question nodes (`questionInsert.ts` maps `guideAnswer`→`answer`, `answerType: "single"`, default feedbackMode, trailing paragraph) |
| Guide-answer draft | `QuestionWriteView` creator mode (empty answer only) | `guide_answer` |
| Distractor chips | `QuestionChoiceView` creator mode | `distractors` (appended as `correct: false`) |
| `AiFormulaPanel` | `FormulaBlock/FormulaCanvas` edit mode | `formula_latex` → writes via the same `persistLatex` path as manual edits |
| `AiWritingAssistant` + `AiWritingToolCard` | EditorHeader "AI text" button + AI hub live-status card. Both share `WritingPreviewDialog`. | `proofread` (6 presets incl. reading_level) |
| `AiDraftLauncher` + `AiDraftDialog` | Empty-doc CTA + AI hub cards (one per tab); no header button. `AiDraftDialog` portals to `document.body` (`data-editor-modal`) so `.editor-main`'s focus-on-click handler cannot steal focus from dialog inputs. Outline inserts **at the caret** (`caretInsertPoint` in `draftHelpers.ts`); the fill tab sends an optional detail box as `styleHint` and offers suggested-question cards (`generate_questions` `scope: "selection"` on the fresh section text). | `outline` · `draft_section` · `import_structure` (+ `generate_questions` from the fill tab) |
| `AiCriticButton` (shared `AiCriticDialog`) | EditorHeader near Publish + AI hub card (each trigger caches its own report) | `critic` (informational only — never gates publish) |
| Publish autofill | `PublishSettingsModal` | `lesson_meta` · `agent_settings_suggest` |

Rules that must not regress: **preview → accept** (AI output enters the doc only via a normal editor transaction after the teacher accepts; reject leaves the doc untouched); **AI prose is markdown** inserted through tiptap-markdown's `insertContentAt` override (string content parses as markdown — round-trip guarded by `ai/__tests__/writingAssist.test.ts`); question blocks arrive as typed JSON already validated server-side, never raw TipTap JSON. The writing assistant is a header dropdown, **not** a BubbleMenu — the editor card's CSS `zoom` makes floating-ui anchoring unreliable.

### How questions reach the AI

`editor/extensions/tutorApi.ts` is the **single bridge** from every AI surface to the server's unified `POST /api/chat/tutor` (rewired in Tier 0 Phase 0.A, 2026-07-10 — the legacy `/chat/ask|feedback|write-evaluate` endpoints and `questionFeedbackApi.ts` are gone):

- `callTutor({ contentId, blockId, mode, message, ... })` → `POST /chat/tutor`. Returns `{ reply, suggestions, sessionId }`; throws `AiUnavailableError` on axios error or empty reply (callers show `AiErrorRetry`, never fake replies).
- `callTutorStream(req, { onToken })` — same contract via SSE; falls back to `callTutor` if the server returns JSON or `fetch` fails **before any token** (never falls back mid-stream). Both attach `personality` from `tutorPersonality.store`.
- Modes per surface: first submit on choice/blank-choice cards → `question_feedback` (client still computes the deterministic level via `questionEvaluation.ts` and passes it in `questionContext.evaluation` + per-choice/per-blank `diagnostics`); blank-write cards → `question_feedback` with `level: "ai_judge"`; write cards → `write_evaluation`; the follow-up thread on any card → `followup` (plain conversation turn, **no evaluation payload** — this is what lets "สวัสดี" be small talk); Ask-AI modal + `QuestionAgentNode` → `free_chat`.
- `feedbackThreadToClientThread(...)` / `qaHistoryToClientThread(...)` map the locally stored thread shapes (role `"ai"` client-side) to the tutor contract (role `"tutor"`), prepending the original answer + first feedback so **anonymous** users keep context. Logged-in users get server-side `ChatSession` history instead (the server ignores `clientThread` for them).
- `contentId` comes from `useCanvasStore((s) => s.contentId)`; the Ask-AI modal uses the pseudo-block id `"__lesson_ai_assistant__"`. The modal also sends a trimmed reading-position hint as `currentSection` (from `getQuestionAgentViewportContext`, the only survivor in `questionAgentContext.ts`).
- Every response's `suggestions` array is stored additively on the block answer (`suggestions?: string[]`) — rendered as tappable chips (Phase 0.C).
- The client **no longer serializes lesson text for the AI** — the server owns lesson context (`lessonContext.service.ts`).

Feedback verbosity is still controlled by `feedbackMode` (`quick_check` | `full_reflection`, see `questionMode.ts`).

**Rendering tutor text:** every AI reply renders through `editor/extensions/MarkdownMessage.tsx` (react-markdown + remark-gfm, strict allowlist: bold/lists/inline code/blockquote/links; raw HTML skipped, images/tables dropped, headings downgraded to bold). Student text stays plain — never wrap student bubbles in it. The server side of the format story: persona `== FORMAT (STRICT) ==` + the `stripReportLabels` guard in `server/src/services/tutor/parse.ts` (added in Tier 0 Phase 0.B).

### Editor UI shell

`TipTapEditor.tsx` defines the layout (top bar, left/right sidebars, main area). `TiptapViewer.tsx` / `FabricCanvasReadOnly.tsx` render the read-only student view. Zoom is a single CSS `zoom` property on the card container (switched from `transform: scale()` on 2026-07-10: `zoom` scales layout height along with the visuals, which killed the double-scrollbar bug in the viewer) — custom nodes don't implement their own zoom. In the viewer the **window is the only vertical scroller**; `.editor-main` never overflows. Toolbar items are `memo()`'d for performance; `dynamicUpdate` toggles "static mode" so they re-render with editor state when needed (details in `components/README.md`). **H1 = lesson title** (sidebar label "Title"); **top-level H2 sections** auto-display `1. 2. 3.` via CSS, resetting after each H1; `numberedSectionHeadings` strips manual `1.` prefixes.

## Persistence model (what the client sends)

- A lesson is created blank (`POST /content/create`), then the editor **autosaves** the serialized TipTap doc via `PUT /content/:id`, sending `clientUpdatedAt` for optimistic-concurrency (handle the **409 conflict**).
- Student answers are keyed by **block id** and saved through `content-answer.store` → `PUT /content-answer/:contentId` (single) or `/bulk`.
- Images upload to Cloudinary (`lib/cloudinary.ts`, `CloudinaryUpload.tsx`); metadata is recorded server-side under the user's image library.

## Environment variables

Create `client/.env` (git-ignored). Only `VITE_`-prefixed vars are exposed to the browser.

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL of the server API (e.g. `http://localhost:5000`) |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary account name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary unsigned upload preset |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web client id for the Login page's "Sign in with Google" button (Google sign-in, 2026-07-11). Unset → the button section simply doesn't render. Origin must be registered in Google Cloud Console (`http://localhost:5173` now; prod URL at Tier 5). |

In production these are set in the Vercel dashboard, with `VITE_API_URL` pointing at the Render server.

## SEO & link previews (Tier 0.A, 2026-07-10)

- `index.html` carries the **site-wide** meta/OG/Twitter tags (Thai description; `og:image` → `/og-image.png`; `twitter:card = summary` because the only art is the square 584×584 logo). `public/robots.txt` allows all crawlers. `public/favicon.png` and `public/og-image.png` are copies of `src/assets/logo.png` served at stable root URLs — never point crawlers at `src/assets/*` (Vite fingerprints those paths, they change every build).
- **Known limitation (deliberate):** this is a client-rendered SPA and social crawlers don't run JS, so **every `/view/:id` lesson link shares the same generic site card**. Real per-lesson OG tags need SSR/prerendering/edge functions — parked as ROADMAP Tier 6.D. Don't try to "fix" it inside `index.html`.
- `og:image`/`twitter:image` are **root-relative until launch**. Tier 5 launch step: switch them to the absolute production URL and validate with the Facebook Sharing Debugger / LINE / Discord paste. `og:url` + canonical are also deferred to Tier 5 for the same reason.
- The static `lang="th"` is the crawler-facing default; `language.store.ts` overwrites `document.documentElement.lang` at runtime when the user toggles language — both are correct, don't unify them.

## Guide pages (2026-07-11, ROADMAP-guide.md at workspace root)

- Scene copy lives as **data** in `src/pages/guide/*Scenes.ts` (`{en, th}` pairs): `learningScenes.ts` (9, phone-first zigzag) + `creatingScenes.ts` (10, `wide: true` → stacked layout for the wide desktop editor shots). Layout in `src/pages/guide/components/` (`ShowcaseShell` shared by both). `SceneImage` picks its max-width from the shot's aspect ratio (landscape editor shots wider than portrait phone/element shots). Scene counts are pinned by tests.
- **Screenshots are generated, never hand-captured:** `node scripts/seed-guide-demo.mjs` then `node scripts/capture-guide.mjs` (Playwright → WebP into `public/guide/` + regenerates `src/pages/guide/guideImages.ts`). Rerun after UI changes; `--scene <id>` recaptures one. AI-marked scenes cost real Gemini tokens.
  - The seed creates demo accounts (`guide.teacher`/`guide.student@hotpotato.local`) + **three teacher lessons**: the link-only demo lesson (every question type — learning shots), a private *scratch* lesson (the editing scenes reset it to its baseline between shots via `resetScratch`), and an untitled *blank* lesson (the empty-doc AI-CTA shot) + 4 vault images. Lesson docs live in `scripts/guide-demo-docs.mjs` (shared by both scripts); ids in `scripts/guide-demo.json`. **Rerun against production at launch** (ids differ per DB).
- **Bundle rule:** guide images are static files under `public/guide/` referenced by URL — never `import` them; both showcase pages stay lazy routes (guarded by tests in `pages/__tests__/`). Entry chunk unchanged at 138 kB gzip; `CreatingShowcase` is its own ~5.5 kB gzip lazy chunk.
- `lib/brand.ts` `BRAND_NAME` = **"Hot Potato"** (owner decision 2026-07-11) — all user-facing copy must use it, never a hardcoded name. Last remnant: the logo art (`src/assets/logo.png`) still reads "Intuita"; asset swap is an owner task.
- **Landing + hub merge rider (2026-07-11):** `learning-01-landing.webp` still shows the pre-merge landing — recapture scene 1 (`scripts/capture-guide.mjs --scene`) when convenient.

## Gotchas

- **`@` alias is mandatory** — relative deep imports break consistency; use `@/...`.
- **Don't read the token from React state for axios** — `lib/axios.ts` already pulls it from the store outside React. Adding a second source causes drift.
- **Tailwind v4 has no JS config.** Theme tokens are in CSS; don't create a `tailwind.config.js`.
- **Editor state = the TipTap node attrs.** Never stash canvas/question data in React state or context expecting it to persist — it won't be saved. (See `components/README.md`.)
- **Server cold starts (Render).** First call after idle is slow plus AI latency; always show loading UI for `/chat/*` and content loads.
- `vercel.json` rewrites all paths to `index.html` (SPA). New client routes work automatically; no extra Vercel config needed.
- **Font size vs viewer zoom.** The app-wide font-size control (`appearance.store`, inline `%` on `<html>`) and the lesson viewer's CSS `zoom` are deliberately separate mechanisms — don't merge them, and never use `transform: scale` (double-scrollbar bug). `--app-nav-height` stays px on purpose.
