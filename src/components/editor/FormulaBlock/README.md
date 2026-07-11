# editor/FormulaBlock/ — the math formula node

> Updated 2026-07-11 · local quick-reference. Node system: [editor-internals.md](../../../../docs/editor-internals.md) §4.

A TipTap node for math. **The `latex` attr is the source of truth**; KaTeX renders it. A teacher types LaTeX (or uses the AI panel) and can hand-edit afterwards.

## Files

| File | What it does |
| --- | --- |
| `index.tsx` | Registers/exports the `FormulaBlockNode` (schema + node view). |
| `FormulaCanvas.tsx` | Renders the `latex` attr with KaTeX (with a render-error fallback); edit mode; **`persistLatex`** writes the attr. |
| `AiFormulaPanel.tsx` | "ให้ AI เขียนสูตร" — plain text (`s = ut + 1/2at^2`) → `formula_latex` action → writes via the **same `persistLatex` path**. |
| `types.ts` | Formula-related types. |
| `formulaToLatex.ts` | Legacy: converts the old visual "tree" → LaTeX. |
| `formulaReducer.ts` | Legacy: the visual-builder reducer (`createFormulaRow`, …). |
| `formulaToolbarBus.ts` | Event bus between the formula node and its toolbar. |
| `FormulaNode.tsx` | ⚠️ **Legacy** visual-builder node — not imported; deletion candidate. |
| `Sidebar.tsx` | ⚠️ **Legacy** formula sidebar — deletion candidate. |

## Gotchas
- **`latex` attr = source of truth.** The legacy tree (`FormulaNode`/`Sidebar`/`formulaReducer`/`formulaToLatex`) is **fallback-only for old lessons** and mostly dead ([`../../../../../notes.md`](../../../../../notes.md)). New edits + Formula AI both write LaTeX through `persistLatex` — **don't regenerate the tree from LaTeX.**
