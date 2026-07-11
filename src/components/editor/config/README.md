# editor/config/ — the node registry

> Updated 2026-07-11 · local quick-reference. Node system: [editor-internals.md](../../../../docs/editor-internals.md) §1.

## Files

| File | What it does |
| --- | --- |
| `editorExtensions.ts` | `createEditorExtensions(editable)` — the single list of TipTap extensions (StarterKit + Link/Table/Youtube/Markdown/… + the custom nodes: `ResizableImage`, `FabricCanvasNode`, `FormulaBlockNode`, the 5 `Question*` nodes, `SearchHighlight`). Passing `editable=false` builds the read-only **viewer**. |

## Gotcha
- **This is where you register a new node.** Add the extension here or the editor and viewer won't know about it. Pair every custom node's `*Node.ts` here (see [`../extensions/README.md`](../extensions/README.md)).
