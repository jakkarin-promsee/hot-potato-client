# editor/ — the lesson editor (the heart of the app)

> Updated 2026-07-11 · local quick-reference. Deep dives: [`../README.md`](../README.md) (Fabric↔TipTap data flow), [`../../../docs/editor-internals.md`](../../../docs/editor-internals.md) (node system), [`../../../../docs/ui-structure.md`](../../../../docs/ui-structure.md) §4 (shell layout).

A TipTap document with custom nodes (question blocks, Fabric canvases, formulas). **One law: the TipTap node is the single source of truth** — block data lives in node `attrs`, not React state (ADR-003). `createEditorExtensions(editable)` builds both the editor (`true`) and the read-only viewer (`false`).

## Files (this folder — the shell)

| File | What it does |
| --- | --- |
| `TipTapEditor.tsx` | The editor shell + layout (top bar, left/right sidebars, main area). Wires nodes, zoom (CSS `zoom`), and `dynamicUpdate` toolbar static-mode. |
| `TiptapViewer.tsx` | The read-only **student** render of a lesson (same nodes, `editable=false`). |
| `FabricCanvasReadOnly.tsx` | Read-only Fabric canvas render for the viewer. |
| `EditorHeader.tsx` | Top bar — title, save state, zoom, Publish button, AI-text entry. |
| `EditorLeftSidebar.tsx` | Left toolbar — text/block tools, categories, the **AI hub**, and the question-insert panel. |
| `EditorRightSidebar.tsx` | Right toolbar — text formatting + Fabric/canvas properties. |
| `ImagePanel.tsx` | Image crop / aspect / align panel. |
| `PublishSettingsModal.tsx` | Publish: `access_type`, topics, description, **`agent_settings`** (tutor controls) + AI autofill. |

## Subfolders (own READMEs)

| Folder | What |
| --- | --- |
| `extensions/` | The custom nodes (5 question types, Fabric, image) + their views + the AI bridge (`tutorApi.ts`) |
| `ai/` | The teacher copilot surfaces (hub, dialogs) — all preview→accept |
| `FormulaBlock/` | The math formula node (`latex` attr → KaTeX) |
| `config/` | `editorExtensions.ts` — the node registry |

## Gotchas
- **Zoom = CSS `zoom`** on the card container, never `transform: scale` (double-scrollbar bug, ADR-007). Separate from the app-wide font size.
- Toolbar items are `memo()`'d; `dynamicUpdate` forces re-render on editor changes.
- **H1 = lesson title**; top-level **H2 = auto-numbered sections** (via CSS + `numberedSectionHeadings`).
