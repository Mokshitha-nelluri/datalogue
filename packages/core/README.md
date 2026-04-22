# datalogue

TypeScript-native natural language to SQL for Node.js.

`datalogue` converts a natural language question into SQL, validates the generated query before execution, and returns structured results for use in application code.

It is designed for application developers who want a small library surface, explicit security controls, and inspectable query output.

## Installation

```bash
npm install datalogue
```

Install only the database driver and AI SDK you need:

```bash
# PostgreSQL + Anthropic
npm install pg @anthropic-ai/sdk

# MySQL + OpenAI
npm install mysql2 openai

# SQLite + Anthropic
npm install better-sqlite3 @anthropic-ai/sdk

# SQL Server + OpenAI
npm install mssql openai
```

## What You Configure

Every `Datalogue` instance needs three things:

- a database connection or adapter
- an AI provider or provider config
- an explicit `allowedTables` list

Everything else is optional.

## Quick Start

```ts
import { Datalogue } from 'datalogue';

const datalogue = new Datalogue({
  db: {
    type: 'postgres',
    connectionString: process.env.DATABASE_URL!,
  },
  ai: {
    type: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY!,
  },
  allowedTables: ['orders', 'customers', 'products'],
  outputFormats: ['summary', 'rows', 'chartSpec'],
});

const result = await datalogue.query('top 10 customers by total order value');

console.log(result.sql);
console.log(result.rows);
console.log(result.summary);
console.log(result.chartSpec);
```

## Common Operations

### Dry Run

Preview generated SQL without executing it:

```ts
const preview = await datalogue.query('orders created this week', {
  dryRun: true,
});

console.log(preview.sql);
console.log(preview.dryRun);
```

### Query Suggestions

Generate example prompts from the connected schema:

```ts
const suggestions = await datalogue.suggestQueries(5);

console.log(suggestions);
```

## What It Supports

- PostgreSQL, MySQL, SQLite, and SQL Server adapters
- Anthropic and OpenAI providers, plus custom providers
- Summary, rows, chart, and CSV outputs
- Multi-turn query context
- Dry-run execution
- React UI components through `datalogue-react`
- Hook and adapter extension points

## Security

- Generated SQL is validated before execution.
- Queries should be constrained with `allowedTables`.
- Database access should use parameterized queries only.
- Generated SQL is always returned so callers can inspect it.
- Database errors are sanitized before being surfaced back through the library.

## Result Shape

```ts
interface QueryResult {
  sql: string;
  rows: Record<string, unknown>[];
  summary?: string;
  chartSpec?: unknown;
  csv?: string;
  confidence: 'high' | 'medium' | 'low';
  executionTimeMs: number;
  rowCount: number;
  dryRun?: boolean;
}
```

## Setup Notes

- Install only the driver and provider packages your app actually uses.
- For multi-tenant data, configure row-level constraints instead of relying on prompting.
- Inspect `result.sql` during development so you can verify what reaches the database.
- Use `datalogue-react` only as a UI layer; the backend still needs the core `datalogue` package.

## Related Packages

- `datalogue-react` provides React components for query input and result rendering.

## More Documentation

For expanded examples, framework helpers, CLI usage, and development notes, see the GitHub repository:

https://github.com/Mokshitha-nelluri/datalogue

## License

ISC
