# pages/ — one component per route

> Updated 2026-07-11 · local quick-reference. Full route tree + guards + layout nesting: [`../../../docs/ui-structure.md`](../../../docs/ui-structure.md). Wiring is in [`../App.tsx`](../App.tsx).

Each file is a route target. All are `React.lazy` in `App.tsx` **except `Landing` and `NotFound`** (eager). Guard column: 🔒 `ProtectedRoute` · 🙋 `RequireLogin` (soft inline prompt) · 🚪 `PublicRoute` · 🌐 public.

## Files

| File | Route | Guard | What it is |
| --- | --- | --- | --- |
| `Landing.tsx` | `/` | 🌐 | Home = landing pitch + guide hub (merged 2026-07-11); eager |
| `Login.tsx` | `/login` | 🚪 | Email/password + Google sign-in; reads `redirect`/`reason`/`code` from the forced-login URL |
| `Explore.tsx` | `/explore` | 🌐 | Browse public lessons (+ bookmarks) |
| `Dashboard.tsx` | `/dashboard` | 🔒 | The creator's own lessons |
| `Create.tsx` | `/create` | 🔒 | Start a new blank lesson → redirect to the editor (default export named `CreatorDashboard`) |
| `TipTapCanvas.tsx` | `/canvas/:id` | 🔒 | **The lesson editor page** — hosts `TipTapEditor`, runs the ~30 s autosave interval |
| `TiptapView.tsx` | `/view/:id` | 🌐 | Public read-only viewer — hosts `TiptapViewer` + the Ask-AI FAB modal |
| `History.tsx` | `/history` | 🙋 | Recently opened lessons |
| `Profile.tsx` | `/profile` | 🙋 | Account (avatar/nickname/bio) + tutor-memory card + personality shortcut |
| `ChangePassword.tsx` | `/change-password` | 🙋 | Password change (400 for Google-only accounts) |
| `Setting.tsx` | `/settings` | 🌐 | Theme, language, font size, tutor personality, help popup; account rows only when logged in |
| `Status.tsx` | `/status` | 🌐 | System health page (30 s poll of `/status/all`); AI health + recent errors cards |
| `Cloudinaryupload.tsx` | `/uploadimage` | 🔒 | Image upload tool — thin wrapper over `components/CloudinaryUpload` |
| `NotFound.tsx` | `*` | 🌐 | 404 |

Guide walkthroughs live in `guide/` (its own README).

## Gotchas
- Adding a protected route? Also add its prefix to `PROTECTED_PATH_PREFIXES` in [`../lib/axios.ts`](../lib/axios.ts) so the 401 redirect targets it.
- Every public page (Landing/Explore/Setting/Status/View) **must work logged out** — Golden Rule 2.
- Some pages are English-only where siblings use `useAppI18n` (i18n gap in [`../../../notes.md`](../../../notes.md)).
