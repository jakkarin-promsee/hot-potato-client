# components/ — shared React components

> Updated 2026-07-11 · this README does **double duty**: (1) a map of this folder (right below), then (2) the original **Editor Data Flow** deep-dive (further down). Related: [`../../docs/editor-internals.md`](../../docs/editor-internals.md) (node system), [`../../../docs/ui-structure.md`](../../../docs/ui-structure.md) (UI map).

Reusable components across pages. The lesson **editor** is the big subfolder (`editor/`); shadcn primitives are in `ui/`.

## Loose components (this folder)

| File | What it does |
| --- | --- |
| `TopNav.tsx` | The top navigation bar (in `AppLayout`); different items logged-in vs anonymous |
| `ProtectedRoute.tsx` | Hard route guard — redirects to `/login` with `state.from` |
| `RequireLogin.tsx` | Soft route guard — inline "please sign in" prompt (`title`/`description` props) |
| `PublicRoute.tsx` | Inverse guard — bounces logged-in users away (e.g. off `/login`) |
| `NavLink.tsx` | Router link wrapper |
| `TopNav`/`ThemeToggle.tsx`/`LanguageToggle.tsx` | Theme + language switchers |
| `PageLoader.tsx` | The `<Suspense>` fallback for lazy routes |
| `ContentCard.tsx` | Lesson card used on Dashboard/Explore |
| `TutorMemoryCard.tsx` | Profile card: view + wipe tutor memory (`/chat/memory`) |
| `CloudinaryUpload.tsx` | The image-upload component (the `/uploadimage` page is a thin wrapper) |

## Subfolders (own READMEs)

| Folder | What |
| --- | --- |
| `editor/` | The TipTap + Fabric lesson editor — shell, sidebars, viewer, `extensions/` (nodes), `ai/` (copilot), `FormulaBlock/`, `config/` |
| `ui/` | shadcn/ui primitives |

---

# Editor Data Flow

## Dependencies

| Package  | Version |
| -------- | ------- |
| Tiptap   | 3.2.0   |
| Fabric   | 7.2.0   |
| Tailwind | 4.2.0   |

## Overview

- Tiptap holds and renders nodes in the main section.
- **Tiptap node is the single source of truth.** All canvas data lives in the node attribute — not in context, not in any hook.
- There are two main editor objects used by the toolbar:
  - **Tiptap Editor** — passed directly to the toolbar via props.
  - **Fabric Canvas** — passed indirectly to the toolbar via `CanvasContext`.
- `CanvasContext` is just a **UI pointer** — it holds a reference to whichever canvas the user is currently interacting with, so the toolbar can reach it without prop drilling. It holds no real canvas data.
- It is set when a canvas node becomes active, and cleared when no canvas is active.
- `CanvasContext` also keeps a `Canvas[]` reference array for use in `useCanvasDrag`, which lets users drag objects between two different canvases.
- Because Fabric 7.2 requires full manual control, we use `useFabric` to expose Fabric functionality and `useFabricSetup` to handle canvas creation.

## Full Workflow

### Tiptap Editor

- **TiptapEditor** — initializes Tiptap, handles custom nodes (Fabric canvas, question, block, etc.), and defines the main editor layout schema (top bar, left sidebar, main area, right sidebar).
- **Tiptap.css** — styles the editor layout and Tiptap-specific props.

### Middle Layer

- **CanvasContext** — a UI coordination layer, not a data store. Holds a reference to the currently active canvas so the toolbar can send commands to it without prop drilling. Also keeps a `Canvas[]` reference array for `useCanvasDrag`.

- **useCanvasDrag** — continuously checks whether an object has been dragged outside its origin canvas. If it lands on another canvas, the object is removed from the origin canvas and recreated on the new one.

- **useFabric** — exposes Fabric tools to edit whichever canvas `CanvasContext` is currently pointing at.

### Fabric Canvas

- **FabricCanvasNode** — initializes the Tiptap node and sets default data.

- **FabricCanvasView** — initializes the canvas via `useFabricSetup`, registers/unregisters with `useCanvasDrag`, and manages context when the canvas becomes active. Also pulls `saveState` from its node attribute and passes it to `useFabricSetup` so the canvas can be restored on mount.

- **useFabricSetup** — creates a new canvas when no Tiptap data exists, or restores from `saveState` when data is present. Wires up `saveState` so every Fabric change serializes back into the Tiptap node attribute automatically.

### saveState

`saveState` is the sync bridge between Fabric and Tiptap. Because Fabric 7.2 requires manual control over all events, nothing is automatic — `useFabricSetup` wires this up explicitly.

The per-canvas flow looks like this:

```
Tiptap node attr (source of truth)
    ↓ on mount:  pull saveState → pass to useFabricSetup → restore canvas
    ↑ on change: Fabric calls saveState → serialize → write back to node attr
```

This means the canvas state is always persisted in the Tiptap document, and `CanvasContext` never needs to touch it.

### UI Layout

- **Top bar** — Tiptap state only (title, save state, zoom level, etc.)
- **Left sidebar** — Tiptap toolbar (receives editor via prop) + Fabric toolbar (pulls canvas from context)
- **Main area** — Tiptap editor only
- **Right sidebar** — Tiptap toolbar (receives editor via prop) + Fabric toolbar (pulls canvas from context)

### Special Functions

- **`dynamicUpdate`** — passed from `TiptapEditor` to most toolbar tools.

  - By default, toolbar items are wrapped in `memo()`, which prevents re-renders and causes the toolbar to not reflect the current editor state after changes.
  - To handle this, we introduced two modes:
    - **Live Mode** — uses standard `memo()` for best performance. Toolbar reflects state normally.
    - **Static Mode** — forces `memo()` to behave like a regular component, triggering re-renders when the editor state changes.

- **Zoom** — implemented using the CSS `zoom` property on the editor container (not `transform: scale()`: `zoom` scales the *layout* box along with the pixels, so the scroll extent always matches what's on screen — `transform` only scaled the pixels, which caused a second scrollbar / dead scroll space). Tiptap and all custom nodes (including Fabric canvases) still don't need to implement their own zoom logic.
