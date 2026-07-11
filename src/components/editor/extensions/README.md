# editor/extensions/ — custom nodes, question blocks & the AI bridge

> Updated 2026-07-11 · local quick-reference. Deep dive: [editor-internals.md](../../../../docs/editor-internals.md) · AI flow: [data-flow.md §5](../../../../../docs/data-flow.md) + [asking-flow.md](../../../../../asking-flow.md).

Each custom node = a `*Node.ts` (TipTap schema/attrs, incl. a stable `id`) + a `*View.tsx` (React render, creator + viewer modes). Node `attrs` **are** the block's saved data (ADR-003).

## The five question types

| Node | View | Type · key attrs |
| --- | --- | --- |
| `QuestionChoiceNode.ts` | `QuestionChoiceView.tsx` | Multiple choice · `choices:{text,correct}[]` |
| `QuestionWriteNode.ts` | `QuestionWriteView.tsx` | Open-ended (AI-graded) · `answer` (guide) |
| `QuestionBlankChoiceNode.ts` | `QuestionBlankChoiceView.tsx` | Fill-blank, pick · `template` + `choices` + `correctByBlank` |
| `QuestionBlankWriteNode.ts` | `QuestionBlankWriteView.tsx` | Fill-blank, typed · `template` + `blankAnswers` |
| `QuestionAgentNode.ts` | `QuestionAgentView.tsx` | Embedded free Ask-AI block · `id` only |

## Other nodes

| File | What |
| --- | --- |
| `FabricCanvasNode.ts` + `FabricCanvasView.tsx` | Embedded Fabric drawing/design canvas (uses `saveState`) |
| `ResizableImage.ts` | Resizable image node |
| `SearchHighlight.ts` | In-document search highlighting |

## AI bridge & feedback rendering

| File | What |
| --- | --- |
| `tutorApi.ts` | **The single student→AI bridge** — `callTutor` / `callTutorStream` → `POST /api/chat/tutor`; picks the mode per surface; SSE with JSON fallback. Throws `AiUnavailableError`. |
| `questionEvaluation.ts` | Computes the **deterministic** level/accuracy/`diagnostics` client-side (passed into feedback modes). |
| `questionMode.ts` | `feedbackMode` types (`quick_check`/`full_reflection`). |
| `questionAgentContext.ts` | Serializes the viewport/reading-position hint (`currentSection`) for the Ask-AI modal. |
| `MarkdownMessage.tsx` | Renders tutor replies as **safe markdown** (strict allowlist, raw HTML skipped). |
| `FeedbackDiscussionPanel.tsx` | The follow-up conversation thread under a question card. |
| `SuggestionChips.tsx` | Tappable follow-up suggestion chips. |
| `AiErrorRetry.tsx` | The honest "AI unavailable, retry" UI (never fakes a reply). |
| `PersonalityPicker.tsx` · `QuestionFeedbackModeToggle.tsx` | Personality selector · per-question feedback-verbosity toggle. |

## Block controls & helpers

| File | What |
| --- | --- |
| `BlockMoveControls.tsx` · `BlockDeleteButton.tsx` | Move/delete a block in the doc |
| `numberedSectionHeadings.ts` | Strips manual `1.` prefixes so H2 auto-numbering works |
| `useAutoGrow.ts` | Auto-growing textarea hook for answer inputs |
| `TestNode.ts` · `TestView.tsx` | Scratch/example node — not a product feature |

## Gotchas
- **The `id` attr keys everything** — the student answer (`UserContent.answers[id]`) and the tutor session. Don't regenerate it.
- Add a node? Also add a serializer branch in the server's `lessonContext.service.ts`, or the tutor is blind to it.
- `followup` thread turns send **no** evaluation payload (that's why small talk isn't graded — ADR-012).
