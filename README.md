<div align="center">

# Hot Potato

**An AI-powered learning platform where teachers author interactive lessons and students learn with a personal AI tutor.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&labelColor=20232a)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Google Gemini](https://img.shields.io/badge/AI-Google_Gemini-4285F4?logo=google&logoColor=white)](https://ai.google.dev)

[**Showcase**](https://hot-potato-client.vercel.app/) · [**Server Repository**](https://github.com/Jakkarin-Promsee/hot-potato-server) · [**Workspace Repository**](https://github.com/jakkarin-promsee/hop-potato-root)

</div>

---

## Overview

Hot Potato is a full-stack learning platform designed for students who are far from good schools and reliable internet. Teachers — including non-technical ones — author rich lessons with embedded critical-thinking questions. Students read the lessons, answer the questions, and can freely ask an AI tutor (Google Gemini) anything about the content. The AI responds with warm, coaching-style feedback in Thai by default, rather than plain grading.

The deployable product is split across two repositories. **This repository contains the web client**; the separate workspace repository holds the cross-cutting architecture documentation.

> **Implementing a feature? Keep the [root workspace repository](https://github.com/jakkarin-promsee/hop-potato-root) alongside this repo.** Its [developer guidebook](https://github.com/jakkarin-promsee/hop-potato-root#developer-guidebook) explains how client and server fit together, and its `graphify-out/` knowledge graph connects UI, API, model, and tutor concepts across both codebases. Check that graph and the current source on both sides before changing an endpoint, lesson block, auth flow, or AI behavior.

| Repository | Role | Stack | Hosted on |
| --- | --- | --- | --- |
| **hot-potato-client** (this repo) | Web app — teacher editor + student viewer + AI chat surfaces | React 19, TypeScript, Vite 7, Tailwind CSS v4 | Vercel configuration |
| [**hot-potato-server**](https://github.com/Jakkarin-Promsee/hot-potato-server) | REST API — auth, lesson storage, student progress, the entire AI layer | Express 5, TypeScript, MongoDB (Mongoose 9), Google Gemini | Render configuration |

Two product principles shape the entire codebase:

1. **AI access is never rationed for real students** — there are no per-student quotas. Rate limiting exists only to stop bots, with generous, environment-tunable thresholds.
2. **Anonymous users keep full access** — reading lessons and using the AI tutor never requires an account. Logging in only adds persistence (answer history, chat history, tutor memory).

## Use cases

The interface is Thai-first and can switch to English. These screenshots show a seeded guide lesson and demo accounts, captured with Playwright at **2× resolution**. The landing screenshots were refreshed from the current running client with [`scripts/capture-readme-landing.mjs`](scripts/capture-readme-landing.mjs); the lesson and editor scenes come from [`scripts/capture-guide.mjs`](scripts/capture-guide.mjs). Those older guide scenes should be recaptured after further UI changes. The in-app walkthroughs are at `/guide/learning` and `/guide/creating` when the client is running.

<img src="docs/readme-landing.webp" alt="Current landing page with paths for students and teachers" width="800">

### Student: explore and read without signing in

1. Open `/` and choose **Start exploring**, or go straight to `/explore`.
2. Search by lesson title; switch between **All**, **Bookmarked**, and **Recent**. Bookmarks are stored on your device.
3. Open a public lesson card. The viewer keeps the teacher's text, media, and embedded questions in reading order.

| Explore lessons | Read a lesson |
| --- | --- |
| <img src="public/guide/learning-02-explore.webp" alt="Explore with search and a bookmarked lesson" width="340"> | <img src="public/guide/learning-03-viewer.webp" alt="Lesson viewer on a phone" width="340"> |

### Student: answer questions and discuss the feedback

The lesson can contain multiple-choice, written-answer, drag-to-fill, and typed-fill questions. Submit your answer to get feedback; a written response is evaluated for reasoning. Follow-up suggestions and the question's conversation thread let you continue thinking through the same topic.

| Choose an answer | Write an answer | Fill a blank |
| --- | --- | --- |
| <img src="public/guide/learning-04a-choice.webp" alt="Multiple-choice question" width="360"> | <img src="public/guide/learning-04b-write.webp" alt="Written-answer question" width="360"> | <img src="public/guide/learning-04c-blankdrag.webp" alt="Drag-to-fill question" width="360"> |

<img src="public/guide/learning-05-feedback.webp" alt="AI feedback with suggested follow-up questions" width="360">

### Student: ask the tutor freely

Tap **Ask AI** in a lesson and ask a question in your own words. Replies stream into a chat grounded in the lesson, with suggested next questions. This also works anonymously; signing in adds server-side conversation history.

| Ask about the lesson | Choose a coaching style |
| --- | --- |
| <img src="public/guide/learning-06-askai.webp" alt="Ask AI conversation" width="340"> | <img src="public/guide/learning-07-personality.webp" alt="Tutor personality selector" width="340"> |

### Student: return to learning and set preferences

With an account, visit **History** to reopen lessons and **Profile** to view or erase tutor memory. Automatic memory updates are currently **off by default** on the server; the memory screen can still display existing data. **Settings** offers language, theme, and font-size controls.

| Learning history | Tutor memory | Settings |
| --- | --- | --- |
| <img src="public/guide/learning-08a-history.webp" alt="Recently opened lessons" width="340"> | <img src="public/guide/learning-08b-memory.webp" alt="Tutor memory card" width="340"> | <img src="public/guide/learning-09-settings.webp" alt="Language and appearance settings" width="340"> |

### Teacher: create and write a lesson

1. Sign in, open **Create**, and start a lesson.
2. Write on the desktop editor canvas. Use the left rail for text, media, formulas, and questions; review the document and formatting controls alongside it.
3. Add images or drawings and build a math expression visually when the lesson needs them.

**Start a lesson:**

<img src="public/guide/creating-01-create-page.webp" alt="Teacher Create page" width="760">

**Open the blank editor, then write and format content:**

<img src="public/guide/creating-02-blank-editor.webp" alt="Blank lesson editor" width="760">

<img src="public/guide/creating-03-editor-overview.webp" alt="Lesson editor with content" width="760">

<img src="public/guide/creating-04-writing.webp" alt="Text editing controls" width="760">

**Add media and formulas:**

<img src="public/guide/creating-05a-media.webp" alt="Image and media controls" width="760">

<img src="public/guide/creating-06-formula.webp" alt="Math formula builder" width="360">

### Teacher: add questions and use the AI copilot

Add a question block from the editor rail and set its prompt, options, and guidance. The **AI** rail offers a workflow for outlining, drafting, improving text, generating questions, and reviewing the lesson. Generated material is previewed; it enters the document only when the teacher accepts it.

**Build a question:**

<img src="public/guide/creating-07a-question-panel.webp" alt="Question blocks in the editor" width="760">

<img src="public/guide/creating-07b-question-creator.webp" alt="Question creator form" width="360">

**Ask AI for a draft, then review its proposal:**

<img src="public/guide/creating-08a-ai-hub.webp" alt="AI tools grouped by writing step" width="760">

<img src="public/guide/creating-08b-draft-preview.webp" alt="AI outline awaiting approval" width="760">

<img src="public/guide/creating-09a-critic.webp" alt="AI lesson review" width="760">

### Teacher: publish and share

Review the lesson, choose **public**, **link-only**, or **private**, and configure the tutor's per-lesson guidance. After publishing, copy or share the lesson link. A teacher can also add collaborators to help maintain a lesson.

<img src="public/guide/creating-09b-publish-modal.webp" alt="Publish dialog and tutor settings" width="760">

<img src="public/guide/creating-10-share.webp" alt="Share controls after publishing" width="760">

## Features

### For students

- **Interactive lesson viewer** — rich text, images, tables, embedded YouTube, math formulas, and drawings, rendered read-only from the same document format the editor produces.
- **Five embedded question types** — multiple choice, open-ended writing (AI-evaluated), fill-in-the-blank (choice and typed), and an embedded free-form AI tutor block.
- **Streaming AI tutor** — answers stream token-by-token over SSE, render as safe markdown, and end with up to three tappable follow-up suggestion chips. Every question card supports a follow-up conversation thread.
- **Six tutor personalities** — students pick the coaching style they like; the choice persists and is attached to every AI call.
- **Tutor memory controls** — logged-in students can view and erase their sketch from the profile page. Automatic sketch updates and injection are disabled by default on the server; operators can enable them with `AI_MEMORY_ENABLED=true`.
- **No login wall** — anonymous visitors can read every public lesson and use the AI tutor in full; conversation context is kept client-side and sent per request.
- **Answer persistence and history** — answers autosave per block; recently opened lessons appear in the history page.

### For teachers

- **Block-based lesson editor** — built on TipTap 3 with custom node types: a resizable-image node, an embedded Fabric.js drawing canvas, a visual math-formula builder that serializes to LaTeX (rendered with KaTeX), and the five question blocks.
- **AI copilot inside the editor** — a dedicated AI hub with eleven assistive actions: lesson outlining, section drafting, structure import, proofreading (six presets), question generation, guide-answer drafting, distractor suggestions, a lesson critic, and publish-metadata autofill. Every AI output goes through a **preview → accept** flow; nothing touches the document without explicit approval.
- **Per-lesson tutor controls** — teachers configure the AI tutor's persona note, answer-directness, scope, and custom guidelines per lesson at publish time.
- **Access control** — lessons can be public, link-only, or private, with collaborator support.
- **Image library** — Cloudinary-backed upload and folder organization.

### Platform & AI engine (server side)

- **One unified tutor endpoint** — `POST /api/chat/tutor` serves four conversation modes (free chat, question feedback, writing evaluation, follow-up) with SSE streaming and a plain-JSON fallback.
- **Server-owned lesson context** — the server loads and serializes the lesson for every AI call (cached), so the client never ships lesson text over the wire.
- **Model routing and resilience** — lightweight tasks go to a fast Gemini model, coaching tasks to a stronger one; transient network failures are retried automatically.
- **Authentication** — email/password (bcrypt) and Google Sign-In (verified Google Identity Services ID tokens with safe account auto-linking), JWT sessions, and role-based guards (`admin` / `creator` / `learner`).
- **Safe concurrent editing** — lesson updates use optimistic concurrency; conflicting edits return 409 instead of silently overwriting.
- **Bilingual UI** — Thai and English interface language, with Thai as the default AI output language.
- **Theming and performance** — light/dark theme, app-wide font-size control, self-hosted fonts, route-level code splitting with heavy vendor libraries (TipTap, Fabric, KaTeX) in separate lazy chunks. The entry chunk stays around 138 kB gzipped.

## Architecture

The two halves communicate over a REST API. The client attaches a JWT `Bearer` token to every request through a single configured Axios instance; AI replies stream back over Server-Sent Events. In production the client is a static SPA on **Vercel**, the API runs on **Render**, data lives in **MongoDB Atlas**, images in **Cloudinary**, and AI inference on **Google Gemini**.

### Client (this repository)

```
src/
├── App.tsx              # router + route guards (the page map)
├── main.tsx             # React root
├── index.css            # Tailwind v4 entry + theme tokens
├── pages/               # one component per route (all lazy-loaded except Landing)
├── layouts/             # AppLayout — shared chrome via <Outlet/>
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── editor/          # the lesson editor: TipTap + Fabric + question blocks
│   │   ├── extensions/  # custom nodes (questions, canvas, image) + tutorApi.ts
│   │   ├── ai/          # teacher AI copilot surfaces
│   │   └── FormulaBlock/ # visual math builder → LaTeX
│   └── *.tsx            # TopNav, route guards, ThemeToggle, ...
├── stores/              # Zustand global state (auth, content, answers, ...)
├── hooks/               # Fabric canvas hooks
├── lib/                 # axios instance, creator API bridge, cloudinary, utils
└── types/               # shared TypeScript types
```

Key design decisions:

- **Single API bridge per AI surface.** All student-facing AI calls go through `src/components/editor/extensions/tutorApi.ts` (`callTutor` / `callTutorStream`), and all teacher-copilot calls through `src/lib/creatorApi.ts`. Streaming falls back to plain JSON transparently if SSE fails before the first token.
- **The TipTap document is the single source of truth.** All editor block data — canvas drawings, question definitions, formulas — lives in node attributes and serializes with the document.
- **Route guards, not scattered checks.** `ProtectedRoute` (hard redirect), `RequireLogin` (soft inline prompt), and `PublicRoute` (bounce authenticated users) wrap routes declaratively in `App.tsx`.
- **Auth token lives in one store.** The Axios instance reads the token from the Zustand auth store outside React and reacts to the server's structured 401 contract by logging out and redirecting only on protected paths.

### Server ([hot-potato-server](https://github.com/Jakkarin-Promsee/hot-potato-server))

An MVC-structured Express 5 + TypeScript service: **route → auth middleware → controller → Mongoose model**, with cross-cutting logic (lesson serialization, AI persona building, retries, observability) in a services layer. The API surface in one glance:

| Group | Base path | What it covers |
| --- | --- | --- |
| Auth | `/api/auth` | Register, login, Google Sign-In, token recheck, change password |
| Content | `/api/content` | Create / load / update / delete / search lessons, access control |
| Answers | `/api/content-answer` | Per-student answer maps, single and bulk save |
| AI chat | `/api/chat` | The unified tutor endpoint + student tutor-memory |
| Teacher copilot | `/api/creator` | One endpoint, eleven authoring actions |
| Users | `/api/users` | Profile read/update, admin user list |
| History | `/api/history` | Recently visited lessons |
| Media | `/api/categories`, `/api/images` | Cloudinary image library + folders |
| Status | `/api/status` | Public aggregated health check + admin diagnostics |

The full per-endpoint reference, data model, AI integration internals, and security notes live in the [server README](https://github.com/Jakkarin-Promsee/hot-potato-server#readme).

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend core | React 19, TypeScript, Vite 7 |
| Styling | Tailwind CSS v4 (CSS-first config), shadcn/ui (Radix primitives), lucide-react, sonner |
| Client state | Zustand (global stores), TanStack Query (server state) |
| Routing / HTTP | React Router 7, Axios |
| Rich text & canvas | TipTap 3 (+ tiptap-markdown), Fabric.js 7, KaTeX, react-markdown + remark-gfm |
| Backend | Node.js, Express 5, TypeScript |
| Database | MongoDB with Mongoose 9 |
| AI | Google Gemini via `@google/genai` (fast + tutor model routing) |
| Auth | JWT, bcrypt, Google Identity Services (`@react-oauth/google` + `google-auth-library`) |
| Media | Cloudinary (unsigned upload) |
| Testing | Vitest + happy-dom (client), Vitest + Supertest + `mongodb-memory-server` (server) |
| Deployment | Vercel (client), Render (server), MongoDB Atlas |

## Getting started

Running the whole platform locally takes two terminals: one for the API, one for the web app.

### Prerequisites

- **Node.js 20.19+** (or 22.12+) and npm
- A **MongoDB** database — a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works, or a local instance
- A **Google Gemini API key** — free from [Google AI Studio](https://aistudio.google.com/)
- A **Cloudinary** account (cloud name + unsigned upload preset) for image uploads
- Optional: a **Google OAuth Web client ID** ([Google Cloud Console](https://console.cloud.google.com/)) to enable Sign in with Google

### 1. Set up the server

```bash
git clone https://github.com/Jakkarin-Promsee/hot-potato-server.git
cd hot-potato-server
npm install
```

Create `hot-potato-server/.env`:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your-gemini-api-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset

# Optional
GOOGLE_CLIENT_ID=your-google-oauth-client-id   # enables POST /auth/google
CORS_ORIGINS=http://localhost:5173             # unset = open (dev only)
AI_OUTPUT_LANGUAGE=thai                        # or "english"
```

Optional tuning knobs (AI model selection, rate limits, memory cadence) are documented in the [server README](https://github.com/Jakkarin-Promsee/hot-potato-server#readme).

Start the API:

```bash
npm run dev      # → http://localhost:5000
```

Verify it is up: `GET http://localhost:5000/` returns a health string, and `GET http://localhost:5000/api/status/all` returns an aggregated systems check.

### 2. Set up the client

```bash
git clone https://github.com/Jakkarin-Promsee/hot-potato-client.git
cd hot-potato-client
npm install
```

Create `hot-potato-client/.env`. Only `VITE_`-prefixed variables are exposed to the browser:

```env
VITE_API_URL=http://localhost:5000
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id   # optional
```

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | yes | Base URL of the server API (no trailing slash) |
| `VITE_CLOUDINARY_CLOUD_NAME` | yes | Cloudinary account name — use the same account as the server |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | yes | Cloudinary unsigned upload preset |
| `VITE_GOOGLE_CLIENT_ID` | no | Google OAuth Web client ID; when unset, the Google Sign-In button is hidden. Use the same client ID as the server's `GOOGLE_CLIENT_ID`, with `http://localhost:5173` registered as an authorized origin |

Start the web app:

```bash
npm run dev      # → http://localhost:5173
```

### 3. Try it

Open `http://localhost:5173`. Stay anonymous to explore a public lesson and use its AI tutor. To create a lesson, register or sign in, then open **Create**. The tutor needs the server's `GEMINI_API_KEY`.

## Available scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite (happy-dom, offline) |

Server-side scripts (test suite, live AI smoke tests, admin promotion) are listed in the [server README](https://github.com/Jakkarin-Promsee/hot-potato-server#readme).

## Testing

Both halves ship offline test suites — no network, no real database, no API key needed:

- **Client:** Vitest + happy-dom. Tests live next to the code they cover (`src/**/__tests__/`) — stores, axios helpers, route guards, editor bridges, AI copilot surfaces, and page-level tests.
- **Server:** Vitest + Supertest with an in-memory MongoDB and a mocked Gemini client, covering every endpoint group plus prompt builders and retry logic.

```bash
npm test         # in either repository
```

## Deployment

| Half | Platform | Configuration |
| --- | --- | --- |
| Client | **Vercel** | Build `npm run build`, output `dist/`. `vercel.json` rewrites all paths to `index.html` for SPA routing. Set the `VITE_*` variables in the dashboard with `VITE_API_URL` pointing at the production API. |
| Server | **Render** | Build `npm install && npm run build`, start `npm start`. Set every server `.env` variable in the dashboard, including `CORS_ORIGINS` with the client's production origin. |

> **Cold starts:** on Render's free tier the API sleeps when idle, so the first request after a pause takes several seconds on top of normal AI latency. The client accounts for this with loading states throughout.

## Related repositories

| Repository | Description |
| --- | --- |
| [hot-potato-server](https://github.com/Jakkarin-Promsee/hot-potato-server) | Express 5 + TypeScript REST API: auth, lesson storage, student progress, and the Gemini AI integration — full API reference in its README |

## Author

**Jakkarin Promsee** — Computer Engineering, KMUTT

- GitHub: [@Jakkarin-Promsee](https://github.com/Jakkarin-Promsee)
- Email: jakkarin.promsee@gmail.com
