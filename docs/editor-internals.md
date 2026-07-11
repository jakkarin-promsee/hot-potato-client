# editor-internals.md — inside the lesson editor

> Updated 2026-07-11 · the deep-dive on `client/src/components/editor/`. **Companion to [`../src/components/README.md`](../src/components/README.md)** (the Fabric↔TipTap data-flow sketch) — start there for the canvas bridge, then read this for the *node system* (questions, formula, AI hub). Node attrs verified against `server/src/services/lessonContext.service.ts` (the serializer that reads them).

The editor is a **TipTap document with custom node types**, some of which embed React (question cards, Fabric canvases, formula builders). Its one law: **the TipTap node is the single source of truth** — all block data is in node `attrs`, serialized with the document (ADR-003). Break that and your data silently won't save.

---

## 1. The node registry

`config/editorExtensions.ts` → `createEditorExtensions(editable)` returns the full extension list. Passing `editable=false` builds the **read-only viewer** with the same nodes — that's why the viewer renders lessons identically.

- **Standard:** StarterKit (headings 1–3, lists, blockquote, codeBlock), Link, Markdown, TextAlign, Underline, TextStyle, Color, Highlight, Table (+row/header/cell), TaskList/TaskItem, Youtube, Placeholder (editable only).
- **Custom nodes:** `ResizableImage`, `FabricCanvasNode`, `FormulaBlockNode`, and the five **Question nodes** (below). `SearchHighlight` adds in-document search.

**Every custom node follows one pattern:** a `*Node.ts` (TipTap schema — name, group, attrs, parse/render, node view wiring) paired with a `*View.tsx` (the React render, usually with a **creator mode** and a **viewer mode**). To add a node, copy this pair and register it in `createEditorExtensions`.

---

## 2. The question-node system (the critical-thinking machinery)

Five nodes, each `Question*Node.ts` + `Question*View.tsx`. Their `attrs` **are** the question definition — this is the exact shape the server serializer reads:

| Node | Key attrs | Guide answer derived from |
| --- | --- | --- |
| `QuestionChoice` | `id`, `question`, `choices: {text, correct}[]`, `feedbackMode` | the `correct: true` choices |
| `QuestionWrite` | `id`, `question`, `answer` (the guide), `feedbackMode` | `answer` directly |
| `QuestionBlankChoice` | `id`, `template` (with `[Q-n]` blank tokens), `choices: string[]`, `correctByBlank: number[]`, `feedbackMode` | `choices[correctByBlank[i]]` joined |
| `QuestionBlankWrite` | `id`, `template`, `blankAnswers: string[]`, `feedbackMode` | `blankAnswers` joined |
| `QuestionAgent` | `id` | — (it's a free Ask-AI block, no grading) |

- **`id` is the stable block id** — it keys the student's answer (`UserContent.answers[id]`) and the tutor session (`ChatSession.block_id`). Don't regenerate it; changing its shape breaks saved work.
- **Blank templates** use a `[Q-n]` token convention; `getBlankIndices`/`renderTemplatePieces`/`BLANK_TOKEN_REGEX` parse them (currently duplicated across the two blank views — a pending shared util, see [`../../notes.md`](../../notes.md)).
- **`feedbackMode`** (`quick_check` | `full_reflection`) sets reply verbosity and model routing (`questionMode.ts`).

### How a question reaches the AI
The viewer's `*View.tsx` computes a **deterministic** verdict client-side (`questionEvaluation.ts` → level/accuracy/`diagnostics`), then calls the AI through the single bridge `extensions/tutorApi.ts`:
- Choice / blank-choice first submit → `question_feedback` with the computed evaluation; blank-write → `question_feedback` with `level: "ai_judge"`; write → `write_evaluation`; the thread → `followup` (raw, no evaluation); Ask-AI → `free_chat`.
- Replies render through `MarkdownMessage.tsx` (strict allowlist); follow-ups live in `FeedbackDiscussionPanel`; chips in `SuggestionChips`. (Full sequence: [`../../docs/data-flow.md`](../../docs/data-flow.md) §5.)

---

## 3. The Fabric canvas bridge (summary — full detail in the components README)

`FabricCanvasNode` embeds a Fabric.js canvas as a node. Because Fabric 7 needs manual event control, `useFabricSetup` wires **`saveState`**: on mount, restore from the node attr; on any change, serialize back into the attr. **`CanvasContext` is a UI pointer only** — it holds a reference to the *active* canvas so the toolbar can reach it without prop-drilling, never canvas data. `useCanvasDrag` lets objects move between canvases (it polls every 500 ms to wire new canvases — a known refactor target). Hooks: `useFabric` (tools), `useFabricSetup` (creation/restore), `useCanvasDrag` (cross-canvas drag). See [`../src/components/README.md`](../src/components/README.md).

---

## 4. The formula block

`editor/FormulaBlock/` — a visual math builder. **The `latex` attr on `FormulaBlockNode` is the source of truth**; `FormulaCanvas` renders it with KaTeX (with a render-error fallback). The legacy visual "tree" (`formulaReducer.ts`/`formulaToLatex.ts`/`FormulaNode.tsx`/`Sidebar.tsx`) is **fallback-only for old lessons** and mostly dead (flagged for deletion in [`../../notes.md`](../../notes.md)) — new edits and the Formula AI both write through `persistLatex` to the `latex` attr (ADR: don't regenerate the tree from LaTeX).

---

## 5. The teacher AI hub (`editor/ai/`)

The copilot UI, entirely inside the lazy editor chunk. A 5th left-sidebar category "AI" (leads the rail) lists tools as cards grouped by workflow (เริ่มบทเรียน → เขียนและเกลา → คำถาม → ก่อนเผยแพร่). Every tool goes through the single bridge `lib/creatorApi.ts` → `POST /api/creator/assist`, and obeys two invariants (ADR-009):

- **Preview → accept:** AI output enters the doc only after the teacher accepts, as a normal editor transaction (autosave/409 untouched). Reject leaves the doc byte-identical.
- **Never raw TipTap JSON:** prose returns as **markdown** (inserted via tiptap-markdown's `insertContentAt`); question blocks arrive as typed JSON already validated server-side (`questionInsert.ts` maps them to node attrs).

Surfaces: `AiQuestionDialog` (generate questions), guide-answer/distractor helpers, `AiFormulaPanel`, `AiWritingAssistant` (+`WritingPreviewDialog`), `AiDraftDialog` (outline/fill/import), `AiCriticDialog`, and Publish-modal autofill (`lesson_meta`/`agent_settings_suggest`). Full map: [`../CLAUDE.md`](../CLAUDE.md) §"Teacher AI copilot".

---

## 6. Two performance/layout traps

- **Toolbar `memo()` + `dynamicUpdate`.** Toolbar items are `memo()`'d (fast but stale). `dynamicUpdate` flips them to "static mode" so they re-render on editor changes when needed. Passed from `TipTapEditor` to most tools.
- **Zoom via CSS `zoom`, not `transform: scale`.** On the card container; scales the layout box so scroll extent matches (ADR-007). Custom nodes need no own zoom. In the viewer, the window is the only vertical scroller — `.editor-main` never overflows.

---

## 7. Editor shell layout

`TipTapEditor.tsx` defines top bar (TipTap state: title/save/zoom) · left sidebar (TipTap toolbar + Fabric tools + AI hub) · main area (the document) · right sidebar (TipTap + canvas props). `TiptapViewer.tsx` / `FabricCanvasReadOnly.tsx` render the student read-only view. **H1 = lesson title**; top-level **H2 sections auto-number** `1. 2. 3.` via CSS (reset after each H1); `numberedSectionHeadings` strips manual prefixes. UI map: [`../../docs/ui-structure.md`](../../docs/ui-structure.md) §4.
