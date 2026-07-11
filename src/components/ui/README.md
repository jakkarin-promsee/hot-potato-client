# components/ui/ — shadcn/ui primitives

> Updated 2026-07-11 · local quick-reference. Config: [`../../../components.json`](../../../components.json).

Generated Radix-based primitives (shadcn/ui). Only the ones actually used are vendored here — add more with the shadcn CLI.

## Files

| File | Primitive |
| --- | --- |
| `button.tsx` | `Button` + `buttonVariants` |
| `card.tsx` | `Card` + parts (`CardHeader/Title/Content/Footer/…`) |
| `input.tsx` | `Input` |
| `textarea.tsx` | `Textarea` |
| `label.tsx` | `Label` |
| `select.tsx` | `Select` + parts |
| `dropdown-menu.tsx` | `DropdownMenu` + parts (used by `TopNav`, toggles) |
| `alert-dialog.tsx` | `AlertDialog` (confirm dialogs, e.g. wipe tutor memory) |

## Rules
- **Don't hand-edit** these generated files unless necessary; regenerate with the shadcn CLI.
- Compose with `cn()` from [`../../lib/utils.ts`](../../lib/utils.ts) and the `buttonVariants`-style variant helpers.
- Tailwind v4 is CSS-first — theme tokens live in `src/index.css`, **no `tailwind.config.js`**.
