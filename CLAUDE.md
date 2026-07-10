# CLAUDE.md — Hot Potato Client

The web app for Hot Potato: where teachers author lessons and students learn. Read the root [`../CLAUDE.md`](../CLAUDE.md) first for cross-cutting context, and [`../server/CLAUDE.md`](../server/CLAUDE.md) for the API it talks to.

## Stack

- **React 19** + **TypeScript**, bundled by **Vite 7**.
- **Tailwind CSS v4** (via `@tailwindcss/vite`) + **shadcn/ui** (Radix primitives, `class-variance-authority`, `clsx`, `tailwind-merge`).
- **State:** Zustand (global stores) + TanStack Query (server state for some flows).
- **Routing:** React Router 7.
- **HTTP:** axios (single configured instance).
- **Editor:** TipTap 3 (rich text) + Fabric.js 7 (canvas) + KaTeX (math) + lowlight (code).
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
- **Tailwind v4** — configuration is CSS-first (see `src/index.css`); there is no `tailwind.config.js`. Editor-specific styles live in `src/indexTiptap.css`.
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
│   ├── design/         # canvas design panels (sidebars, properties, assets)
│   └── *.tsx           # TopNav, ContentCard, route guards, ThemeToggle, etc.
├── stores/             # Zustand global state
├── hooks/              # useFabric, useFabricSetup, useCanvasDrag
├── contexts/           # CanvasContext (UI pointer to active Fabric canvas)
├── lib/                # axios, cloudinary, formatting, utils
└── types/              # shared TS types
```

## Routing & page map

Defined in `App.tsx` with three guard components. `BrowserRouter` + `QueryClientProvider` wrap everything. On mount, if a persisted token exists, `recheckToken()` re-validates it.

| Path | Page | Guard | Notes |
| --- | --- | --- | --- |
| `/` | `Landing` | — | Marketing/landing |
| `/login` | `Login` | `PublicRoute` | Redirects away if already logged in |
| `/explore` | `Explore` | — | Browse public lessons |
| `/guide` | `Guide` | — | How-to / help |
| `/dashboard` | `Dashboard` | `ProtectedRoute` | Creator's lessons |
| `/create` | `Create` | `ProtectedRoute` | Start a new lesson |
| `/canvas/:id` | `TipTapCanvas` | `ProtectedRoute` | **The lesson editor** |
| `/view/:id` | `TiptapView` | — | Public read-only lesson viewer (API uses optionalAuth) |
| `/history` | `History` | `RequireLogin` | Recently opened lessons |
| `/profile` | `Profile` | `RequireLogin` | Account — loads/saves via `GET/PUT /users/me/profile` (Tier 2.A) |
| `/change-password` | `ChangePassword` | `RequireLogin` | Security |
| `/settings` | `Setting` | — | Settings |
| `/uploadimage` | `Cloudinaryupload` | `ProtectedRoute` | Image upload tool |
| `/status` | `Status` | — | System status (v2: AI health + recent errors cards, bilingual) |
| `*` | `NotFound` | — | 404 |

Routes under `/login … /settings` render inside `AppLayout` (shared nav chrome). The three guards:

- **`ProtectedRoute`** — hard gate; redirects unauthenticated users to `/login` with `state.from` for redirect-back (Tier 2.B).
- **`RequireLogin`** — soft gate; renders an inline "please sign in" prompt (with `title`/`description` props) instead of redirecting. The login link carries `state.from`.
- **`PublicRoute`** — for auth-only-when-logged-out pages (e.g. `/login`); bounces authenticated users to `redirect` query param or `/explore`.

## State management (Zustand)

Global stores in `src/stores/`. Each is a `create()` store; some use the `persist` middleware (localStorage).

| Store | Responsibility |
| --- | --- |
| `auth.store` | `user` + `token` (**persisted** as `auth-storage`), `login` / `register` / `recheckToken` / `logout` |
| `profile.store` | Account profile (`GET/PUT /users/me/profile`); syncs `auth.store` on name change |
| `bookmark.store` | Device-local lesson bookmarks (**persisted** as `bookmark-storage`) |
| `content.store` | The current lesson document (load / create / update / delete via API) |
| `content-answer.store` | The student's answers for the current lesson (load / save / bulk-save) |
| `learningHistory.store` | Recently visited lessons |
| `category.store` | Image-library categories |
| `cloudinary.store` | Image upload / library state |
| `canvas.store` | Canvas-related UI state + `agentSettings` for publish modal (Tier 1.B) |
| `tutorPersonality.store` | Student tutor preset id (**persisted** as `tutor-personality-storage`); auto-attached on every `/chat/tutor` call |
| `language.store` | UI language (Thai / English) |
| `theme.store` | Light / dark theme |
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

`TipTapEditor.tsx` defines the layout (top bar, left/right sidebars, main area). `TiptapViewer.tsx` / `FabricCanvasReadOnly.tsx` render the read-only student view. Zoom is a single CSS `zoom` property on the card container (switched from `transform: scale()` on 2026-07-10: `zoom` scales layout height along with the visuals, which killed the double-scrollbar bug in the viewer) — custom nodes don't implement their own zoom. In the viewer the **window is the only vertical scroller**; `.editor-main` never overflows. Toolbar items are `memo()`'d for performance; `dynamicUpdate` toggles "static mode" so they re-render with editor state when needed (details in `components/README.md`).

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

In production these are set in the Vercel dashboard, with `VITE_API_URL` pointing at the Render server.

## SEO & link previews (Tier 0.A, 2026-07-10)

- `index.html` carries the **site-wide** meta/OG/Twitter tags (Thai description; `og:image` → `/og-image.png`; `twitter:card = summary` because the only art is the square 584×584 logo). `public/robots.txt` allows all crawlers. `public/favicon.png` and `public/og-image.png` are copies of `src/assets/logo.png` served at stable root URLs — never point crawlers at `src/assets/*` (Vite fingerprints those paths, they change every build).
- **Known limitation (deliberate):** this is a client-rendered SPA and social crawlers don't run JS, so **every `/view/:id` lesson link shares the same generic site card**. Real per-lesson OG tags need SSR/prerendering/edge functions — parked as ROADMAP Tier 6.D. Don't try to "fix" it inside `index.html`.
- `og:image`/`twitter:image` are **root-relative until launch**. Tier 5 launch step: switch them to the absolute production URL and validate with the Facebook Sharing Debugger / LINE / Discord paste. `og:url` + canonical are also deferred to Tier 5 for the same reason.
- The static `lang="th"` is the crawler-facing default; `language.store.ts` overwrites `document.documentElement.lang` at runtime when the user toggles language — both are correct, don't unify them.

## Gotchas

- **`@` alias is mandatory** — relative deep imports break consistency; use `@/...`.
- **Don't read the token from React state for axios** — `lib/axios.ts` already pulls it from the store outside React. Adding a second source causes drift.
- **Tailwind v4 has no JS config.** Theme tokens are in CSS; don't create a `tailwind.config.js`.
- **Editor state = the TipTap node attrs.** Never stash canvas/question data in React state or context expecting it to persist — it won't be saved. (See `components/README.md`.)
- **Server cold starts (Render).** First call after idle is slow plus AI latency; always show loading UI for `/chat/*` and content loads.
- `vercel.json` rewrites all paths to `index.html` (SPA). New client routes work automatically; no extra Vercel config needed.
