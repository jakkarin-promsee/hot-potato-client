# editor/ai/ — the teacher copilot surfaces

> Updated 2026-07-11 · local quick-reference. Flow: [data-flow.md §6](../../../../../docs/data-flow.md) · full map: [client CLAUDE.md](../../../../CLAUDE.md) §"Teacher AI copilot". Server counterpart: `server/src/services/creator/`.

The in-editor AI tools. All call the single bridge `lib/creatorApi.ts` → `POST /api/creator/assist`, and **all obey preview → accept** (nothing enters the doc until the teacher accepts). Lives inside the lazy editor chunk.

## Files

| File | What it does |
| --- | --- |
| `AiToolsPanel.tsx` | **The AI hub** — the 5th left-sidebar category; lists every tool as a card grouped by workflow (เริ่ม → เขียน/เกลา → คำถาม → ก่อนเผยแพร่). |
| `AiQuestionDialog.tsx` | "สร้างคำถามด้วย AI" — scope/type/count → preview cards → insert. |
| `QuestionPreviewCard.tsx` | One generated-question preview card. |
| `questionInsert.ts` | Maps validated AI question JSON → real question nodes (attrs, `[Q-n]` templates). |
| `AiWritingAssistant.tsx` | Header dropdown + hub card: proofread / format / reading-level actions (selection-based). |
| `writingAssist.ts` | The writing-action logic + the before/after preview plumbing. |
| `AiCriticButton.tsx` | "ตรวจบทเรียน" — opens the shared critic dialog (informational; never gates publish). |
| `AiDraftLauncher.tsx` | Empty-doc CTA + header entry that opens the draft dialog. |
| `AiDraftDialog.tsx` | 3 tabs: outline / fill section / paste-import. Portals to `document.body` (`data-editor-modal`) so editor focus-steal can't grab dialog inputs. |
| `draftHelpers.ts` | `caretInsertPoint` (insert at caret) + draft insertion helpers. |

*(The Formula AI panel lives in `../FormulaBlock/AiFormulaPanel.tsx`; publish autofill is in `../PublishSettingsModal.tsx`.)*

## Gotchas (must not regress — ADR-009)
- **Preview → accept:** AI output enters only via a normal editor transaction after accept; reject leaves the doc byte-identical.
- **Never raw TipTap JSON:** prose is markdown (via tiptap-markdown's `insertContentAt`); question blocks are typed JSON already validated server-side.
- The writing assistant is a **header dropdown, not a BubbleMenu** — the editor's CSS `zoom` breaks floating-ui anchoring.
