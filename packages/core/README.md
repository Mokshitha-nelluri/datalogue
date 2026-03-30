<p align="center">
  <strong>datalogue</strong><br>
  Natural language database queries for Node.js — secure, TypeScript-native, drop-in.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/datalogue"><img src="https://img.shields.io/npm/v/datalogue.svg" alt="npm version"></a>
  <a href="https://github.com/Mokshitha-nelluri/datalogue/actions"><img src="https://img.shields.io/github/actions/workflow/status/Mokshitha-nelluri/datalogue/ci.yml?branch=main" alt="CI"></a>
  <a href="https://www.npmjs.com/package/datalogue"><img src="https://img.shields.io/npm/dm/datalogue.svg" alt="npm downloads"></a>
  <a href="https://github.com/Mokshitha-nelluri/datalogue/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/datalogue.svg" alt="license"></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-blue" alt="TypeScript strict">
</p>

---

**Datalogue** lets developers add natural language database querying to any Node.js app in under 10 minutes. Install it, point it at your database, and your users can ask questions in plain English — getting back natural language answers, charts, raw rows, or CSV.

No new infrastructure. No SaaS subscription. Just a package.

```bash
npm install datalogue
```

## Quick Start

```typescript
import { Datalogue } from 'datalogue';

const qm = new Datalogue({
  db: { type: 'postgres', connectionString: process.env.DATABASE_URL! },
  ai: { type: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY! },
  allowedTables: ['orders', 'customers', 'products'],
});

const result = await qm.query('top 10 customers by total order value');

console.log(result.summary);   // "ACME Corp leads with $124,500 in total orders..."
console.log(result.chartSpec); // Chart.js-compatible bar chart config
console.log(result.rows);     // Raw result rows
console.log(result.sql);      // The generated SQL (always visible)
```

That's it. Every generated SQL query is validated at the AST level before execution — **no exceptions**.

---

## Features

- **AST-level SQL validation** — every LLM-generated query is parsed into an abstract syntax tree before execution. Blocks injection at the structural level.
- **4 databases** — PostgreSQL, MySQL/MariaDB, SQLite, MS SQL Server
- **2 AI providers + custom** — Anthropic Claude, OpenAI, or bring your own
- **Smart output inference** — auto-detects time-series, categorical, proportional data and returns the right chart type
- **Multi-turn conversations** — session history with pluggable storage (in-memory, Redis, any KV store)
- **Row-level security** — `rowFilter` config appends tenant isolation at the adapter level, not the LLM level
- **Dry-run mode** — preview generated SQL without executing it
- **Query suggestions** — auto-generate example questions from your schema
- **Hooks API** — `beforeQuery`, `afterQuery`, `onBlock` for custom middleware
- **Framework helpers** — Express, Fastify, NestJS, Next.js, Hono (~30 lines each)
- **React components** — drop-in `<QueryBox />` and `<ResultView />` with full customization
- **CLI mode** — `npx datalogue serve` for instant internal tool
- **TypeScript strict** — full type inference, zero `any` types
- **Dual ESM + CJS** — works in legacy Express apps and modern Next.js

---

## Table of Contents

- [Installation](#installation)
- [Database Support](#database-support)
- [AI Provider Support](#ai-provider-support)
- [Output Formats](#output-formats)
- [Examples](#examples)
- [Multi-Turn Conversations](#multi-turn-conversations)
- [Dry-Run Mode](#dry-run-mode)
- [Query Suggestions](#query-suggestions)
- [Row-Level Security](#row-level-security)
- [Schema Descriptions](#schema-descriptions)
- [Hooks API](#hooks-api)
- [Framework Helpers](#framework-helpers)
- [React Components](#react-components)
- [CLI — Internal Tool Mode](#cli--internal-tool-mode)
- [Security](#security)
- [Configuration Reference](#configuration-reference)
- [Custom Providers](#custom-providers)
- [Why Datalogue](#why-datalogue)
- [Known Limitations](#known-limitations-v1)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

```bash
# Core library
npm install datalogue

# Install ONLY the driver and AI SDK you use:
npm install pg @anthropic-ai/sdk         # Postgres + Claude
npm install mysql2 openai                 # MySQL + OpenAI
npm install better-sqlite3 @anthropic-ai/sdk  # SQLite + Claude
npm install mssql openai                  # MS SQL Server + OpenAI
```

### React Component (optional)

```bash
npm install datalogue-react
```

---

## Database Support

| Database | Package | Notes |
|---|---|---|
| **PostgreSQL** | `pg` | #1 database — 55.6% of devs in 2025 |
| **MySQL** | `mysql2` | Also covers MariaDB (same wire protocol) |
| **SQLite** | `better-sqlite3` | Local dev, embedded, desktop apps |
| **MS SQL Server** | `mssql` | Enterprise / Azure SQL |

## AI Provider Support

| Provider | Package | Default Model |
|---|---|---|
| **Anthropic Claude** | `@anthropic-ai/sdk` | `claude-sonnet-4-6` |
| **OpenAI** | `openai` | `gpt-4o` |
| **Custom** | — | Implement the `AIProvider` interface |

---

## Output Formats

Datalogue automatically infers the best format from the query result:

| Data Shape | Inferred Output |
|---|---|
| Single number | `summary` only |
| Time-series (date column) | `line` chart spec |
| Ranked categories (≤12 rows) | `bar` chart spec |
| Proportional data (sums to ~100%) | `pie` chart spec |
| Many rows (>12) | `table` + `csv` |

Override per-query:

```typescript
const result = await qm.query('all transactions this year', {
  outputFormats: ['csv'],
});
```

### QueryResult shape

```typescript
interface QueryResult {
  sql: string;                        // Generated SQL (always returned)
  rows: Record<string, unknown>[];    // Raw result rows
  summary?: string;                   // Natural language answer
  chartSpec?: ChartSpec;              // Chart.js-compatible config
  csv?: string;                       // CSV string
  confidence: 'high' | 'medium' | 'low';
  executionTimeMs: number;
  rowCount: number;
  dryRun?: boolean;
}
```

---

## Examples

### Consumer App with Chat Interface

Build a personal finance app where users ask about their own spending:

```typescript
// Backend — configure once
const qm = new Datalogue({
  db: { type: 'postgres', connectionString: process.env.DATABASE_URL! },
  ai: { type: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY! },
  allowedTables: ['transactions', 'categories'],
  outputFormats: ['summary', 'chartSpec'],
});

app.post('/api/query', async (req, res) => {
  const result = await qm.query(req.body.question, { userId: req.user.id });
  res.json(result);
});
```

```tsx
// Frontend — drop in the chat component
import { QueryBox } from 'datalogue-react';

export default function SpendingPage() {
  return (
    <QueryBox
      endpoint="/api/query"
      placeholder="Ask about your spending..."
      theme="light"
      showInlineResults
      onResult={(result) => {
        // result.summary  → "You spent $340 on food in March, 23% more than February"
        // result.chartSpec → Chart.js-compatible config, render directly
      }}
      onMessagesChange={(messages) => {
        // Persist conversation to localStorage, DB, or anywhere
        localStorage.setItem('chat', JSON.stringify(messages));
      }}
    />
  );
}
```

User types: *"how much did I spend on food last month?"*

Datalogue generates SQL → validates it at the AST level → executes safely → returns a summary, chart spec, and rows.

### Dashboard with Scheduled Queries + Interactive Chat

Combine automated charts with a conversational interface in the same app:

```typescript
import { Datalogue } from 'datalogue';

const qm = new Datalogue({
  db: { type: 'postgres', connectionString: process.env.DATABASE_URL! },
  ai: { type: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY! },
  allowedTables: ['expenses', 'departments', 'budgets'],
  outputFormats: ['chartSpec', 'rows'],
});

// Scheduled — refresh dashboard charts every hour
async function refreshDashboard() {
  const spendByDept = await qm.query('total spend by department this week');
  const monthlyTrend = await qm.query('daily expenses for the last 30 days');
  await cache.set('spend_by_dept', spendByDept.chartSpec);
  await cache.set('monthly_trend', monthlyTrend.chartSpec);
}

// Interactive — user asks follow-up questions
app.post('/api/analyse', async (req, res) => {
  const result = await qm.query(req.body.question, {
    userId: req.user.id,
    sessionId: req.body.sessionId,
  });
  res.json(result);
});
```

No existing NL→SQL tool handles both scheduled and interactive querying cleanly. This is Datalogue's headline feature.

---


## Multi-Turn Conversations

```typescript
const r1 = await qm.query('top 10 customers by spend', { sessionId: 'sess_123' });
const r2 = await qm.query('now filter to just New York', { sessionId: 'sess_123' });
const r3 = await qm.query('show as a bar chart', { sessionId: 'sess_123' });
```

Session history is in-memory by default (bounded, with TTL). For persistent sessions, provide a `SessionStore`:

```typescript
const qm = new Datalogue({
  // ...
  session: {
    maxHistoryLength: 50,
    ttlMinutes: 60,
    store: myRedisSessionStore, // implements get(), set(), delete()
  },
});
```

---

## Dry-Run Mode

Preview the generated SQL without executing it:

```typescript
const preview = await qm.query('all refunds this month', { dryRun: true });
// preview.sql    → "SELECT ... FROM transactions WHERE ..."
// preview.rows   → [] (not executed)
// preview.dryRun → true
```

---

## Query Suggestions

Generate example questions based on the schema:

```typescript
const suggestions = await qm.suggestQueries(5);
// ["Top 10 customers by total order value",
//  "Monthly revenue trend",
//  "Product categories with highest average quantity"]
```

---

## Row-Level Security

For multi-tenant apps, ensure users only see their own data:

```typescript
const qm = new Datalogue({
  db: { type: 'postgres', connectionString: process.env.DATABASE_URL! },
  ai: { type: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY! },
  allowedTables: ['transactions', 'categories'],
  rowFilter: { column: 'user_id' },
});

// Every query gets WHERE user_id = $1 — applied at the adapter level,
// not by the LLM. Cannot be bypassed by prompt injection.
const result = await qm.query('show all transactions', { userId: req.user.id });
```

---

## Schema Descriptions

Improve SQL accuracy for abbreviated or domain-specific column names:

```typescript
const qm = new Datalogue({
  // ...
  tableDescriptions: {
    orders: {
      description: 'Customer purchase orders',
      columns: {
        oid: 'Unique order ID',
        cust_ref: 'Customer reference (FK to customers.id)',
        tot_amt: 'Total order amount in USD',
      },
    },
  },
});
```

---

## Hooks API

Build custom middleware on top of Datalogue:

```typescript
const qm = new Datalogue({
  // ...
  hooks: {
    beforeQuery: async (query, userId) => {
      await analytics.track(userId, 'nl_query', { query });
    },
    afterQuery: async (result, userId) => {
      result.summary = `[${getUserCompany(userId)}] ${result.summary}`;
      return result;
    },
    onBlock: async (reason, query, userId) => {
      await alerting.send(`Blocked query from ${userId}: ${reason}`);
    },
  },
});
```

---

## Framework Helpers

Thin wrappers (~30 lines each) for popular frameworks:

```typescript
// Express
import { createDatalogueRouter } from 'datalogue/express';
app.use('/api/query', createDatalogueRouter(qm));

// Next.js App Router
import { createDatalogueHandler } from 'datalogue/next';
export const POST = createDatalogueHandler(qm);

// Fastify
import { dataloguePlugin } from 'datalogue/fastify';
fastify.register(dataloguePlugin, { datalogue: qm });

// Hono
import { datalogueMiddleware } from 'datalogue/hono';
app.post('/api/query', datalogueMiddleware(qm));
```

---

## React Components

### `<QueryBox />`

Drop-in chat interface with full developer control over every aspect:

```tsx
import { QueryBox } from 'datalogue-react';
import type { QueryBoxAPI } from 'datalogue-react';

// Basic usage — works out of the box
<QueryBox
  endpoint="/api/query"
  placeholder="Ask about your data..."
  suggestions={['Top customers', 'Monthly revenue']}
  showDryRunToggle
  showConfidence
  theme="light"
  onResult={(result) => console.log(result)}
/>
```

#### Conversation persistence

Own your conversation history — save to localStorage, a database, or anywhere:

```tsx
const [messages, setMessages] = useState<ChatMessage[]>(() => {
  const saved = localStorage.getItem('chat');
  return saved ? JSON.parse(saved) : [];
});

<QueryBox
  endpoint="/api/query"
  initialMessages={messages}
  onMessagesChange={(msgs) => {
    setMessages(msgs);
    localStorage.setItem('chat', JSON.stringify(msgs));
  }}
/>
```

#### Request/response transforms

Match any API shape — add auth tokens, session IDs, or parse wrapped responses:

```tsx
<QueryBox
  endpoint="/api/query"
  transformRequest={(body) => ({
    ...body,
    userId: user.id,
    sessionId: session.id,
    token: authToken,
  })}
  transformResponse={(data) => (data as { result: QueryResult }).result}
/>
```

#### Intercept and control queries

```tsx
<QueryBox
  endpoint="/api/query"
  onBeforeSubmit={async (query) => {
    if (query.includes('delete')) return false; // cancel
    return query.trim(); // transform
  }}
/>
```

#### Programmatic control

```tsx
const apiRef = useRef<QueryBoxAPI>();

<QueryBox
  endpoint="/api/query"
  onReady={(api) => { apiRef.current = api; }}
/>

// Submit from outside the component
<button onClick={() => apiRef.current?.submit('top customers')}>Quick query</button>
<button onClick={() => apiRef.current?.clear()}>Clear chat</button>
```

#### Custom rendering

Replace any UI element — loading states, error displays, messages, input area:

```tsx
<QueryBox
  endpoint="/api/query"
  renderEmpty={() => <div>Ask anything about your data!</div>}
  renderLoading={() => <MySpinner />}
  renderError={(err) => <MyErrorBanner message={err} />}
  renderMessage={(msg, i) => <MyMessageBubble key={i} message={msg} />}
  renderInput={({ value, onChange, onSubmit, loading }) => (
    <MyCustomInput
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      disabled={loading}
    />
  )}
  showInlineResults  // Render charts/tables inside chat bubbles
/>
```

#### Full props reference

| Prop | Type | Description |
|---|---|---|
| `endpoint` | `string` | API endpoint to POST queries to |
| `placeholder` | `string` | Input placeholder text |
| `theme` | `'light' \| 'dark'` | Visual theme |
| `suggestions` | `string[]` | Clickable example queries |
| `showDryRunToggle` | `boolean` | Enable dry-run preview toggle |
| `showConfidence` | `boolean` | Show confidence badge on results |
| `showInlineResults` | `boolean` | Render charts/tables inside chat bubbles |
| `onResult` | `(result) => void` | Called on successful result |
| `onError` | `(error) => void` | Called on error |
| `headers` | `Record<string, string>` | Custom fetch headers |
| `style` | `CSSProperties` | Root container style override |
| `className` | `string` | Root container class override |
| `initialMessages` | `ChatMessage[]` | Pre-populate chat from saved state |
| `onMessagesChange` | `(messages) => void` | Persist conversation on every change |
| `onBeforeSubmit` | `(query) => string \| false` | Intercept/transform/cancel before send |
| `transformRequest` | `(body) => object` | Reshape the fetch request body |
| `transformResponse` | `(data) => QueryResult` | Parse custom API response shapes |
| `onReady` | `(api) => void` | Receive imperative `{ submit, clear }` methods |
| `renderEmpty` | `() => ReactElement` | Custom empty state |
| `renderLoading` | `() => ReactElement` | Custom loading indicator |
| `renderError` | `(error) => ReactElement` | Custom error display |
| `renderMessage` | `(msg, index) => ReactElement` | Custom message renderer |
| `renderInput` | `(props) => ReactElement` | Custom input area |

### `<ResultView />`

Auto-renders charts, tables, summary text, and CSV download — with full override support:

```tsx
import { ResultView } from 'datalogue-react';

<ResultView
  result={queryResult}
  showChart
  showTable
  showSQL
  showCSVDownload
  renderChart={(spec) => <MyChartLib spec={spec} />}
  renderTable={(rows, columns) => <AGGrid rows={rows} columns={columns} />}
  renderSQL={(sql) => <SyntaxHighlighter language="sql">{sql}</SyntaxHighlighter>}
/>
```

| Prop | Type | Description |
|---|---|---|
| `result` | `QueryResult` | The result to render |
| `theme` | `'light' \| 'dark'` | Visual theme |
| `showSummary` | `boolean` | Show/hide summary section |
| `showChart` | `boolean` | Show/hide chart tab |
| `showTable` | `boolean` | Show/hide table tab |
| `showSQL` | `boolean` | Show/hide SQL tab |
| `showCSVDownload` | `boolean` | Show/hide CSV download button |
| `maxTableRows` | `number` | Cap rendered table rows (default: 100) |
| `renderChart` | `(chartSpec) => ReactElement` | Custom chart renderer |
| `renderTable` | `(rows, columns) => ReactElement` | Custom table renderer |
| `renderSQL` | `(sql) => ReactElement` | Custom SQL renderer |
| `style` | `CSSProperties` | Root container style override |
| `className` | `string` | Root container class override |

Every visual element is overridable. Datalogue gives you tools to build with — you own the UI.

---

## CLI — Internal Tool Mode

Spin up a full web UI with one command:

```bash
npx datalogue serve \
  --db postgres://user:pass@host/mydb \
  --allowed-tables orders,customers,products \
  --port 3001
```

---

## Security

Datalogue's security model is built around one principle: **never trust LLM output.**

Every query passes through a multi-layer validation pipeline before execution:

1. **AST parsing** — SQL is parsed into an abstract syntax tree using `node-sql-parser`. If it can't be parsed, it's rejected.
2. **Statement type check** — only `SELECT` allowed by default. `DROP`, `ALTER`, `TRUNCATE`, `GRANT`, `REVOKE` are **always blocked**, even with `allowMutations: true`.
3. **Table allowlist** — every referenced table is checked against the explicit `allowedTables` list. No hallucinated tables reach the database.
4. **System schema blocking** — `pg_catalog`, `information_schema`, `sys`, `sqlite_master` are blocked (the Vanna.ai CVE vector).
5. **Dangerous function blocking** — `pg_read_file`, `LOAD_FILE`, `xp_cmdshell`, and 12+ other filesystem/command execution functions are blocked.
6. **Multi-statement rejection** — `SELECT 1; DROP TABLE users` is blocked before execution.
7. **Comment stripping** — `--`, `/* */`, and `#` comments are stripped before parsing (injection vector).
8. **Hex-encoded string rejection** — `0x414243` patterns are blocked (obfuscation vector).
9. **Query length limit** — queries over 2000 characters are rejected (prompt injection vector).
10. **SQL regeneration** — the validated SQL is regenerated from the AST, preventing obfuscation from surviving validation.

### DB error sanitization

When a query fails at the database, the error is sanitized before being sent back to the LLM for retry. Raw DB errors can contain table names, column names, data snippets, and connection strings — Datalogue never sends those to an external API.

### Audit logging

Every query (successful or blocked) is logged with full context:

```typescript
{
  timestamp: '2026-03-20T10:30:00.000Z',
  userId: 'user_123',
  naturalLanguageQuery: 'show all transactions',
  generatedSQL: 'SELECT * FROM transactions',
  rowCount: 42,
  executionTimeMs: 150,
  blocked: false
}
```

Custom log destination via `auditLogFn` config.

---

## Configuration Reference

```typescript
const qm = new Datalogue({
  // Database (required) — config object or custom DBAdapter
  db: { type: 'postgres', connectionString: '...' },

  // AI provider (required) — config object or custom AIProvider
  ai: { type: 'anthropic', apiKey: '...' },

  // Table allowlist (required)
  allowedTables: ['orders', 'customers'],

  // Security (optional)
  allowMutations: false,        // Allow INSERT/UPDATE/DELETE (default: false)
  maxRowsReturned: 1000,        // Cap result rows (default: 1000)
  rowFilter: { column: 'user_id' },

  // Output (optional)
  outputFormats: ['rows', 'summary', 'chartSpec', 'csv', 'sql'],

  // Schema descriptions (optional)
  tableDescriptions: { /* ... */ },

  // Audit (optional)
  auditLog: true,               // Default: true
  auditLogFn: (entry) => { },   // Custom log destination

  // Sessions (optional)
  session: {
    maxHistoryLength: 50,
    ttlMinutes: 60,
    store: mySessionStore,
  },

  // Rate limiting (optional — requires rate-limiter-flexible peer dep)
  rateLimit: { requestsPerMinute: 60 },

  // Hooks (optional)
  hooks: { beforeQuery, afterQuery, onBlock },
});
```

---

## Custom Providers

### Custom AI Provider

```typescript
const myProvider: AIProvider = {
  async complete(systemPrompt, userMessage, history) {
    // Call your own model, local LLM, etc.
    return 'EXPLANATION: ...\nCONFIDENCE: HIGH\nSQL:\nSELECT ...';
  },
};

const qm = new Datalogue({
  ai: myProvider,
  // ...
});
```

### Custom DB Adapter

```typescript
const myAdapter: DBAdapter = {
  dialect: 'postgres',
  async query(sql, params) { /* ... */ },
  async introspect() { /* return SchemaInfo */ },
  async close() { /* ... */ },
};

const qm = new Datalogue({
  db: myAdapter,
  // ...
});
```

---

## Why Datalogue

| | Vanna.ai | LangChain SQL | Dataherald | **Datalogue** |
|---|---|---|---|---|
| **SQL validation** | `sqlparse` keyword check (CVE 8.7) | None | `sqlparse` blocklist | **AST-level structural validation** |
| **TypeScript-native** | Python | Python + JS wrapper | Python | **TypeScript library** |
| **Session persistence** | In-memory | Deprecated → LangGraph | MongoDB | **In-memory + SessionStore interface** |
| **Row-level security** | Hook-based | None | Org-scoped | **Hook-based + rowFilter config** |
| **Install size** | N/A (Python) | 9.6 kB (re-exports only) | N/A (Python) | **~434 kB gzipped** |

---

## Known Limitations (v1)

1. **Rate limiting is opt-in.** Install `rate-limiter-flexible` and configure `rateLimit` if you need per-user query limiting inside Datalogue. Most developers already have rate limiting at the API layer.

2. **`node-sql-parser` has limited MSSQL/SQLite support.** The validator falls back to conservative regex-based validation when AST parsing fails for these dialects. Some valid but unusual queries may be incorrectly blocked.

3. **No row-level security without explicit `rowFilter` config.** If multiple users share the same tables, you must configure `rowFilter`. Without it, any user can query any row in allowed tables.

4. **Session history is in-memory by default.** Restarting the process clears all sessions. Provide a `SessionStore` for persistence.

5. **Bundle size.** `node-sql-parser` is ~419 kB gzipped because it bundles grammar files for every SQL dialect. This is the cost of AST-level validation — the feature that prevents the class of vulnerability that gave Vanna.ai a CVE 8.7/10.

---

## Environment Variables

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...  # Only if using OpenAI provider
```

---

## Development

```bash
pnpm install
pnpm run build
pnpm run test          # 244 tests
pnpm run test:watch    # Watch mode
pnpm run typecheck     # TypeScript strict
```

---

## Contributing

Contributions are welcome. Please:

1. Fork the repo and create a feature branch
2. Write tests for any new functionality
3. Run `pnpm run test && pnpm run typecheck` before submitting
4. Open a PR with a clear description of the change

See [CHANGELOG.md](CHANGELOG.md) for release history.

---

## License

ISC
