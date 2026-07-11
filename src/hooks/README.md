# hooks/ — React hooks (mostly Fabric canvas)

> Updated 2026-07-11 · local quick-reference. The canvas hooks are explained in depth in [`../components/README.md`](../components/README.md) and [`../../docs/editor-internals.md`](../../docs/editor-internals.md).

## Files

| File | What it does |
| --- | --- |
| `useFabric.ts` | Exposes Fabric tools (add shape/text/image/arrow, style, layer, the `RichLine` class, GIF/video helpers) operating on whichever canvas `CanvasContext` currently points at. The big one. |
| `useFabricSetup.ts` | Creates a new Fabric canvas (or restores from the node's `saveState`) and **wires `saveState`** so every change serializes back into the TipTap node attr. |
| `useCanvasDrag.ts` | Lets objects be dragged between two canvases; removes from origin, recreates on target. (Polls every 500 ms to wire new canvases — a refactor target.) |
| `useColdStartHint.ts` | Surfaces a "server is waking up" hint during long AI/content waits (Render cold start). Slow ≠ broken. |
| `useRevealOnScrollUp.ts` | UI: reveal a bar/element on upward scroll, hide on downward. |

## Gotchas
- The Fabric hooks exist because **Fabric 7 requires manual event control** — nothing is automatic. `saveState` is the bridge that keeps **TipTap = source of truth** (ADR-003).
- `useFabric`'s GIF/video RAF loop needs cleanup on canvas `dispose()` (noted in [`../../../notes.md`](../../../notes.md)).
