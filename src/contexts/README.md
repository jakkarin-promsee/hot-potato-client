# contexts/ — React context (UI coordination only)

> Updated 2026-07-11 · local quick-reference. Deep dive: [`../components/README.md`](../components/README.md).

## Files

| File | What it does |
| --- | --- |
| `CanvasContext.tsx` | A **UI pointer**, not a data store. Holds a reference to the currently-active Fabric canvas so the toolbar can send it commands without prop-drilling, plus a `Canvas[]` registry used by `useCanvasDrag`. Set when a canvas becomes active, cleared when none is. |

## Gotcha
- **`CanvasContext` holds no real canvas data** — all canvas state lives in the TipTap node's `saveState` attr (ADR-003). Don't put document data here expecting it to persist; it won't be saved.
