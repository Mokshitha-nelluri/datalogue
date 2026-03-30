Create a new database adapter for $ARGUMENTS.

Follow the exact pattern of packages/core/src/adapters/postgres.ts.
Implement the DBAdapter interface from packages/core/src/adapters/types.ts.

Must include:
- Connection config interface — add to QueryMindConfig union in index.ts
- introspect() querying information_schema for this dialect
- query() with parameterised execution using this DB's driver API
- close() for connection pool cleanup
- Unit test in tests/unit/adapters/$ARGUMENTS.test.ts
- Add dialect to SchemaInfo and DBAdapter dialect union in types.ts

Write the test first. Implement until it passes.