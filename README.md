# Hot Potato — Client

The web app for [Hot Potato](../README.md): where teachers author rich, critical-thinking lessons and students learn by answering questions and freely asking an AI tutor.

Built with **React 19 + TypeScript + Vite**, **Tailwind CSS v4 + shadcn/ui**, with a **TipTap**-based lesson editor (custom question, canvas, and formula blocks). Deployed to **Vercel**.

> Looking for the architecture, routing map, state model, and editor internals? See [`CLAUDE.md`](CLAUDE.md). The editor data-flow deep-dive is in [`src/components/README.md`](src/components/README.md).

---

## Prerequisites

- Node.js 18+ and npm
- The **Hot Potato server** running (locally or on Render) — see [`../server/README.md`](../server/README.md)
- A **Cloudinary** account (cloud name + unsigned upload preset) for image uploads

## Setup

```bash
cd client
npm install
```

Create a `.env` file in `client/` (git-ignored). Only `VITE_`-prefixed variables are exposed to the browser:

```env
VITE_API_URL=http://localhost:5000
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset
```

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Base URL of the server API (no trailing slash) |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary account name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary unsigned upload preset |

## Run

```bash
npm run dev        # dev server → http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve the production build locally
npm run lint       # eslint
```

## Tech stack

| Area | Libraries |
| --- | --- |
| Core | React 19, TypeScript, Vite 7 |
| Styling | Tailwind CSS v4, shadcn/ui (Radix), `tailwind-merge`, `clsx`, lucide-react |
| State | Zustand (global), TanStack Query (server state) |
| Routing | React Router 7 |
| HTTP | axios (single instance in `src/lib/axios.ts`) |
| Editor | TipTap 3, Fabric.js 7 (canvas), KaTeX (math), lowlight (code) |
| Media | Cloudinary |

## Project structure

```
client/src/
├── App.tsx          # routes + auth guards
├── main.tsx         # app entry
├── pages/           # one component per route
├── layouts/         # shared layout chrome
├── components/
│   ├── ui/          # shadcn/ui primitives
│   └── editor/      # the TipTap lesson editor + question/canvas/formula blocks
├── stores/          # Zustand state (auth, content, answers, ...)
├── hooks/           # Fabric canvas hooks
├── contexts/        # CanvasContext
├── lib/             # axios, cloudinary, utils
└── types/
```

Notable conventions:

- Import via the **`@` alias** (`@/components/...`) — it maps to `src/`.
- Tailwind v4 is **CSS-first**: theme tokens live in `src/index.css`, there is no `tailwind.config.js`.
- shadcn/ui config is in `components.json`; generated primitives live in `src/components/ui/`.

## Deployment (Vercel)

The client is a Vite SPA deployed to Vercel.

- **Build command:** `npm run build` · **Output directory:** `dist`
- `vercel.json` rewrites all routes to `index.html` so client-side routing works on refresh/deep links.
- Set the `VITE_*` environment variables in the Vercel dashboard, with `VITE_API_URL` pointing at the Render server URL.

## Notes

- No automated tests yet.
- The login/sign-in flow is a known phase-2 cleanup target.
