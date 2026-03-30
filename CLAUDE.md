# QueryMind

TypeScript monorepo — NL→SQL npm library.
Read @datalogue-project-brief.md before implementing anything new.

## Commands
- pnpm install
- pnpm run build
- pnpm run test
- pnpm run typecheck  ← run this before every task is marked done
- pnpm run lint

## Hard rules — never break
- TypeScript strict. Zero `any` types. Ever.
- All LLM-generated SQL must pass through validator.ts before DB execution.
- Never return raw DB error messages — always throw typed DataLogueError.
- Parameterised queries only. Never string-interpolate into SQL.
- Tests before implementation on every module.
- pnpm not npm.

## Stack
- packages/core → datalogue (main library)
- packages/react → datalogue-react
- packages/integrations → framework helpers
- cli/ → npx querymind serve
- apps/demo → Next.js 15 on Vercel

## Corrections log
← Claude adds lines here automatically via auto-memory.
← You can also add manually: "never use default exports in adapters/"