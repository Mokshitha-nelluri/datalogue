Review $ARGUMENTS for QueryMind-specific security issues:

1. Any SQL string interpolation bypassing validator.ts
2. Raw DB error messages returned to users instead of QueryMindError
3. `any` types that weaken type safety
4. allowedTables not enforced somewhere it should be
5. Multiple SQL statements not blocked
6. OWASP LLM Top 10 — prompt injection and data exfiltration

For each issue: file path + line number + exact fix required.
If clean, say "no issues found".