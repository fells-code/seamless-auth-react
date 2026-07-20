---
"@seamless-auth/react": patch
---

Emit relative import paths in the published type declarations. The build kept the
`@/*` tsconfig path aliases in the generated `.d.ts` files, which no consumer can
resolve, so every downstream project silently saw the SDK's public surface as
`any` (masked by `skipLibCheck`). A `tsc-alias` post-build step now rewrites the
aliases to relative paths, restoring real types for consumers.
