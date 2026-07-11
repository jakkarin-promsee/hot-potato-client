# layouts/ — shared page chrome

> Updated 2026-07-11 · local quick-reference. UI map: [`../../../docs/ui-structure.md`](../../../docs/ui-structure.md) §3.

## Files

| File | What it does |
| --- | --- |
| `AppLayout.tsx` | The shared shell: `<TopNav/>` + `<Outlet/>`. Wraps the "app" routes (`/`, `/login`, `/explore`, `/history`, `/create`, `/profile`, `/change-password`, `/settings`, guide). |

## Gotcha
- **Full-bleed routes render *outside* `AppLayout`** (no TopNav): `/canvas/:id` (editor), `/view/:id` (viewer), `/uploadimage`, `/status` — each owns its whole screen. Check `App.tsx` before assuming a route has the shared nav.
