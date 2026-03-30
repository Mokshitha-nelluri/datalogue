Pre-commit checklist on all changed files:

1. No `any` types introduced
2. Every new public function has explicit return type
3. Every error path throws QueryMindError with typed error code
4. Every SQL execution passes through validator.ts first
5. Audit logger called for every query (blocked or successful)
6. Tests exist for every new public function
7. pnpm typecheck passes clean

List violations with file + line. If all clear: "ready to commit".