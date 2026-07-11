# lib/ — framework-free helpers

> Updated 2026-07-11 · local quick-reference for this folder. Deeper: [`../../CLAUDE.md`](../../CLAUDE.md), [`../../../docs/ui-state.md`](../../../docs/ui-state.md) (axios/token flow), [`../../../docs/data-flow.md`](../../../docs/data-flow.md) §1.

Plain TS utilities and API bridges — no React. Import via the `@/lib/...` alias.

## Files

| File | What it does |
| --- | --- |
| `axios.ts` | **The one configured axios instance.** Request interceptor attaches the JWT (read from `auth.store` outside React); response interceptor auto-logs-out on the **structured 401** and redirects only on protected paths. Exports `isProtectedPath`, `isSafeRedirectTarget`, `buildForcedLoginUrl`. **Use this for every API call.** |
| `creatorApi.ts` | The single teacher-copilot bridge — `callCreator(contentId, action, payload)` → `POST /api/creator/assist`; throws `CreatorAiError` with a machine code. (Student AI bridge lives in `components/editor/extensions/tutorApi.ts`.) |
| `cloudinary.ts` | Cloudinary unsigned-upload helpers; `isConfigured()` guards missing env. |
| `clipboardPasteImageCache.ts` | Dedupes pasted images by content hash → reuses the Cloudinary secure URL instead of re-uploading. |
| `i18n.ts` | `useAppI18n` + the UI string catalog (Thai/English). |
| `utils.ts` | `cn()` — `clsx` + `tailwind-merge` (the shadcn className helper). |
| `format.ts` | Date / misc display formatting. |
| `formatAuthors.ts` | Builds the "by X, Y" author line from `author_name` + `collaborator_names`. |
| `clientEnv.ts` | Reads/validates the `VITE_` env vars in one place. |
| `contact.ts` | `OWNER_FACEBOOK_URL` (Settings help popup). Placeholder until launch. |
| `brand.ts` | `BRAND_NAME = "Hot Potato"` — always use this, never hardcode the name. |

## Gotchas
- **Never create a second axios instance** and never read the token from React state for a request — `axios.ts` is the single source (drift otherwise).
- `VITE_` vars are **build-time inlined** — changing one needs a rebuild, not a restart.
