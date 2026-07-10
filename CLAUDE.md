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
client/src/components/editor/extensions/__tests__/
├── questionEvaluation.test.ts   # choice accuracy math
├── questionAgentContext.test.ts # chat-history serializer
└── questionFeedbackApi.test.ts  # axios bridge + fallback behavior
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
| `/profile` | `Profile` | `RequireLogin` | Account |
| `/change-password` | `ChangePassword` | `RequireLogin` | Security |
| `/settings` | `Setting` | — | Settings |
| `/uploadimage` | `Cloudinaryupload` | `ProtectedRoute` | Image upload tool |
| `/status` | `Status` | — | System status |
| `*` | `NotFound` | — | 404 |

Routes under `/login … /settings` render inside `AppLayout` (shared nav chrome). The three guards:

- **`ProtectedRoute`** — hard gate; redirects unauthenticated users to login.
- **`RequireLogin`** — soft gate; renders an inline "please sign in" prompt (with `title`/`description` props) instead of redirecting. Used for personal-but-not-secret pages.
- **`PublicRoute`** — for auth-only-when-logged-out pages (e.g. `/login`); bounces authenticated users away.

> **Phase-2 note:** the login/sign-in flow is a known cleanup target. Touch `Login`, the guards, and `lib/axios.ts`'s force-relogin handling together.

## State management (Zustand)

Global stores in `src/stores/`. Each is a `create()` store; some use the `persist` middleware (localStorage).

| Store | Responsibility |
| --- | --- |
| `auth.store` | `user` + `token` (**persisted** as `auth-storage`), `login` / `register` / `recheckToken` / `logout` |
| `content.store` | The current lesson document (load / create / update / delete via API) |
| `content-answer.store` | The student's answers for the current lesson (load / save / bulk-save) |
| `learningHistory.store` | Recently visited lessons |
| `category.store` | Image-library categories |
| `cloudinary.store` | Image upload / library state |
| `canvas.store` | Canvas-related UI state |
| `language.store` | UI language (Thai / English) |
| `theme.store` | Light / dark theme |
| `status.store` | System-status page data |

`auth.store` is the source of truth for the token; `lib/axios.ts` reads it directly (outside React) to attach the `Bearer` header.

## Data fetching & API contract

`src/lib/axios.ts` exports a single configured `api` instance — **use it for all API calls** (don't create new axios instances):

- `baseURL = import.meta.env.VITE_API_URL`.
- **Request interceptor** attaches `Authorization: Bearer <token>` from `auth.store`.
- **Response interceptor** watches for the server's structured 401 (`forceRelogin` / `clearToken`, see [`../server/CLAUDE.md`](../server/CLAUDE.md)). On such a 401 it logs out and — only for protected paths — redirects to `/login?reason=...`. Pass `{ skipAuthRedirect: true }` on a request to opt out (e.g. `recheckToken` does this).

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

`editor/extensions/questionFeedbackApi.ts` is the bridge from question views to the server's `/api/chat/*`:

- `requestQuestionFeedback(...)` → `POST /chat/feedback` (structured answers).
- `requestWriteEvaluation(...)` → `POST /chat/write-evaluate` (open-ended answers).
- `requestFeedbackFollowup(...)` → builds a follow-up coaching turn on top of `/chat/feedback` (used by `FeedbackDiscussionPanel.tsx` for the back-and-forth thread).

Each call throws `AiUnavailableError` on failure (axios error or empty response). Callers show an `AiErrorRetry` inline box with Thai copy instead of fake feedback strings. Feedback verbosity is controlled by `feedbackMode` (`quick_check` | `full_reflection`, see `questionMode.ts`). The `QuestionAgentNode` free-Q&A uses `/chat/ask` with the lesson as `context` (see `questionAgentContext.ts`).

> **⚠️ This whole bridge is being reworked** (roadmap Phases 1 → 5). Phase 0 replaced silent Thai fallback strings with honest `AiUnavailableError` + retry UI. **Phase 5** points all four flows at a single new `POST /api/chat/tutor` endpoint and deletes the `requestFeedbackFollowup` hack (which today fakes a conversation by re-calling `/chat/feedback`). Read [`../ROADMAP-detailed.md`](../ROADMAP-detailed.md) before changing anything in `questionFeedbackApi.ts` or the `Question*View.tsx` files.

### Editor UI shell

`TipTapEditor.tsx` defines the layout (top bar, left/right sidebars, main area). `TiptapViewer.tsx` / `FabricCanvasReadOnly.tsx` render the read-only student view. Zoom is a single CSS `transform: scale()` on the container — custom nodes don't implement their own zoom. Toolbar items are `memo()`'d for performance; `dynamicUpdate` toggles "static mode" so they re-render with editor state when needed (details in `components/README.md`).

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

## Gotchas

- **`@` alias is mandatory** — relative deep imports break consistency; use `@/...`.
- **Don't read the token from React state for axios** — `lib/axios.ts` already pulls it from the store outside React. Adding a second source causes drift.
- **Tailwind v4 has no JS config.** Theme tokens are in CSS; don't create a `tailwind.config.js`.
- **Editor state = the TipTap node attrs.** Never stash canvas/question data in React state or context expecting it to persist — it won't be saved. (See `components/README.md`.)
- **Server cold starts (Render).** First call after idle is slow plus AI latency; always show loading UI for `/chat/*` and content loads.
- `vercel.json` rewrites all paths to `index.html` (SPA). New client routes work automatically; no extra Vercel config needed.
