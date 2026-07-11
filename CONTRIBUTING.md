# Contributing — Hot Potato Client

Thanks for working on the web app. This is the client half; the API is a **separate git repository** (`hot-potato-server`). Read [`CLAUDE.md`](CLAUDE.md) for the full architecture and the rules you must not break.

> New here? Start with [`../docs/onboarding.md`](../docs/onboarding.md) (get it running), [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) (the mental model), and [`../docs/ui-structure.md`](../docs/ui-structure.md) + [`../docs/ui-state.md`](../docs/ui-state.md) (the frontend shape).

## Ground rules

1. **Golden Rule 2 is a UI requirement.** Public pages (`/`, `/explore`, `/settings`, `/status`, `/view/:id`) and the AI must work **logged out**. Test every change in an incognito window too.
2. **Tests + lint green before done.** `npm test` (offline, happy-dom) and `npm run lint`. Every change ships tests. See [`../docs/testing.md`](../docs/testing.md).
3. **Update the docs you invalidate** (`CLAUDE.md`, the relevant `docs/`).
4. **Git reality.** Run git **inside `client/`**, never from the workspace root. Don't push/deploy unless asked.

## Code style (match the existing files)

- **`@` alias → `src/`** is mandatory — no deep relative imports (`@/components/...`, `@/stores/...`).
- **shadcn/ui** primitives live in `components/ui/`; don't hand-edit generated ones. Compose with `cn()` from `@/lib/utils`.
- **Tailwind v4 is CSS-first** — theme tokens in `index.css`; there is **no `tailwind.config.js`**, don't create one.
- **File naming:** pages `PascalCase.tsx`, stores `*.store.ts`, hooks `useX.ts`, libs `camelCase.ts`.
- **Bilingual UI** via `useAppI18n` (Thai/English); AI output is Thai by default.
- **Never read the auth token from React state for API calls** — `lib/axios.ts` reads it from the store outside React. One source of truth.
- **Editor data = TipTap node attrs**, never React state expecting persistence (ADR-003).

## Recipe: add an editor node / question type

1. Create the pair: `components/editor/extensions/XNode.ts` (TipTap schema — name, group, `attrs` incl. a stable `id`, parse/render, node view) + `XView.tsx` (React render, creator + viewer modes). Copy an existing `Question*` pair.
2. Register it in `config/editorExtensions.ts` (`createEditorExtensions`).
3. If students answer it, key state by the block `id` in `content-answer.store` (`UserContent.answers[id]`), and decide its tutor `mode` in `extensions/tutorApi.ts`.
4. **Make the AI able to see it:** add a serializer branch in the server's `lessonContext.service.ts` (else the tutor is blind to it).
5. Test: an attrs↔serializer mapping test + a render test. See [`docs/editor-internals.md`](docs/editor-internals.md).

## Recipe: add a store / page / route

- **Store:** `stores/x.store.ts`, plain `create<State>()`; opt into `persist` only for device prefs or the token (with `partialize`). Talk to the API via the shared `@/lib/axios` instance. See [`../docs/ui-state.md`](../docs/ui-state.md).
- **Page + route:** add the component under `pages/`, then a `React.lazy` import + `<Route>` in `App.tsx`. Pick a guard: `ProtectedRoute` (hard redirect), `RequireLogin` (soft inline prompt), `PublicRoute` (bounce logged-in), or none (public). Add protected prefixes to the list in `lib/axios.ts`. Wrap in `AppLayout` for shared chrome; keep it full-bleed otherwise. See [`../docs/ui-structure.md`](../docs/ui-structure.md).

## Recipe: add an env var

Only `VITE_`-prefixed vars reach the browser (and they're **build-time inlined** — a change needs a rebuild, not just a restart). Document it in [`CLAUDE.md`](CLAUDE.md) + [`README.md`](README.md) with its unset behavior (e.g. Google button hidden when `VITE_GOOGLE_CLIENT_ID` is unset). If it must be set in prod, add it to [`../docs/operations.md`](../docs/operations.md).

## Performance guardrail

Don't statically import a heavy lib (TipTap/Fabric/KaTeX) into shared/entry code — keep routes `React.lazy` and heavy vendors in `manualChunks`. Reference guide images as `public/` URLs, never `import`. Re-check the entry chunk size on `npm run build`. See [`../docs/performance.md`](../docs/performance.md).

## Pull request checklist

- [ ] `npm test` + `npm run lint` green; new tests cover the change
- [ ] `npm run build` passes; entry chunk not bloated
- [ ] Works **logged out** (incognito) — Golden Rule 2
- [ ] Phone pass at ~390 px (largest font size too)
- [ ] `@` alias used; no token read from React; no `tailwind.config.js`
- [ ] Docs updated (`CLAUDE.md` / `docs/` as applicable)
