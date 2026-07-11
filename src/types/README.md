# types/ — shared TypeScript types

> Updated 2026-07-11 · local quick-reference.

Cross-cutting type declarations shared across the client. Most types live next to the code that owns them; this folder is for truly shared shapes.

## Files

| File | What it does |
| --- | --- |
| `cloudinary.types.ts` | Types for Cloudinary upload responses / image metadata used by `lib/cloudinary.ts` + the image library UI. |

## Note
Vite env types live in `src/vite-env.d.ts` (not here). Component/store-local types stay in their own files — only promote a type here when two+ unrelated areas need it.
