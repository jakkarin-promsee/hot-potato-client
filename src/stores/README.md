# stores/ — Zustand global state

> Updated 2026-07-11 · local quick-reference. Full model: [`../../../docs/ui-state.md`](../../../docs/ui-state.md) (grouping, persistence boundaries, store↔API map).

Each file is a `create()` store. A few use `persist` (localStorage). Talk to the API through `@/lib/axios`. ✅ = persisted.

## Files

| File | Owns | Persist |
| --- | --- | --- |
| `auth.store.ts` | `user` + `token`; login/register/loginWithGoogle/recheckToken/logout | ✅ `auth-storage` (user+token only) |
| `profile.store.ts` | Account profile (`GET/PUT /users/me/profile`); syncs auth on name change | — |
| `canvas.store.ts` | **The lesson being edited/viewed:** title, `tiptapJson`, `agentSettings`, access, `updatedAt`, `isDirty`, `conflict`; `loadContent`/`saveContent`/`forceSave` (autosave + 409) | — |
| `content-answer.store.ts` | The student's answer map for the open lesson; `setAnswer` (local) → `syncAnswers` (bulk) | — |
| `content.store.ts` | Lesson lists (`contents` mine + `exploreContents`); create/search/delete | — |
| `learningHistory.store.ts` | Recently visited lessons | — |
| `bookmark.store.ts` | Device-local lesson bookmarks | ✅ `bookmark-storage` |
| `cloudinary.store.ts` | Image upload / library state | — |
| `category.store.ts` | Image-library folders | — |
| `tutorPersonality.store.ts` | Selected tutor preset id; auto-attached to every `/chat/tutor` call | ✅ `tutor-personality-storage` |
| `tutorMemory.store.ts` | Student's tutor-memory sketch (`GET/DELETE /chat/memory`); strips internal fields | — |
| `theme.store.ts` | Light/dark theme | ✅ |
| `language.store.ts` | UI language; also sets `<html lang>` | ✅ |
| `appearance.store.ts` | App-wide font size → inline `%` on `<html>` (imported in `main.tsx`) | ✅ `app-font-size` |
| `status.store.ts` | System-status page data | — |

## Gotchas
- **`canvas.store` owns the autosave + optimistic-concurrency (409) logic** — see [`../../../docs/data-flow.md`](../../../docs/data-flow.md) §3. The lesson *document* is the `tiptapJson` string here; block data must be in TipTap node attrs, not a store.
- Anonymous users' `canvas`/`content-answer` state is **in-memory only** — never synced (Golden Rule 2).
- Some stores share one `error` field across flows (e.g. `content.store` dashboard vs explore) — scope errors when you touch them ([`../../../notes.md`](../../../notes.md)).
- Persist only device prefs / the token, with `partialize` to keep it minimal (see `auth.store`).
