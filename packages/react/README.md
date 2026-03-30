<p align="center">
  <strong>datalogue-react</strong><br>
  Drop-in React components for Datalogue — chat UI and result rendering.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/datalogue-react"><img src="https://img.shields.io/npm/v/datalogue-react.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/datalogue"><img src="https://img.shields.io/npm/v/datalogue.svg?label=datalogue" alt="datalogue version"></a>
  <a href="https://github.com/Mokshitha-nelluri/datalogue/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/datalogue-react.svg" alt="license"></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-blue" alt="TypeScript strict">
</p>

---

React components for [datalogue](https://www.npmjs.com/package/datalogue) — the TypeScript-native NL→SQL library. Add a natural language database chat interface to any React app in minutes.

## Installation

```bash
npm install datalogue-react datalogue react react-dom
```

`datalogue-react` has peer dependencies on `datalogue`, `react` (≥18), and `react-dom` (≥18).

---

## Quick Start

```tsx
import { QueryBox } from 'datalogue-react';

export default function App() {
  return (
    <QueryBox
      endpoint="/api/query"
      placeholder="Ask about your data..."
      suggestions={['Top customers', 'Monthly revenue']}
      showConfidence
      theme="light"
      onResult={(result) => console.log(result)}
    />
  );
}
```

That's it — a full chat UI that sends queries to your Datalogue backend and renders results with charts, tables, and summaries.

---

## Components

### `<QueryBox />`

A complete chat interface with input, message history, suggestions, and inline results.

```tsx
import { QueryBox } from 'datalogue-react';
import type { QueryBoxAPI } from 'datalogue-react';
```

#### Conversation persistence

```tsx
<QueryBox
  endpoint="/api/query"
  initialMessages={messages}
  onMessagesChange={(msgs) => {
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

<button onClick={() => apiRef.current?.submit('top customers')}>Quick query</button>
<button onClick={() => apiRef.current?.clear()}>Clear chat</button>
```

#### Custom rendering

Replace any UI element:

```tsx
<QueryBox
  endpoint="/api/query"
  renderEmpty={() => <div>Ask anything about your data!</div>}
  renderLoading={() => <MySpinner />}
  renderError={(err) => <MyErrorBanner message={err} />}
  renderMessage={(msg, i) => <MyMessageBubble key={i} message={msg} />}
  renderInput={({ value, onChange, onSubmit, loading }) => (
    <MyCustomInput value={value} onChange={onChange} onSubmit={onSubmit} disabled={loading} />
  )}
/>
```

#### Props

| Prop | Type | Description |
|---|---|---|
| `endpoint` | `string` | API endpoint to POST queries to |
| `placeholder` | `string` | Input placeholder text |
| `theme` | `'light' \| 'dark'` | Visual theme |
| `suggestions` | `string[]` | Clickable example queries |
| `showDryRunToggle` | `boolean` | Enable dry-run preview toggle |
| `showConfidence` | `boolean` | Show confidence badge on results |
| `showInlineResults` | `boolean` | Render charts/tables inside chat bubbles |
| `headers` | `Record<string, string>` | Custom fetch headers |
| `style` | `CSSProperties` | Root container style override |
| `className` | `string` | Root container class override |
| `initialMessages` | `ChatMessage[]` | Pre-populate chat from saved state |
| `onResult` | `(result) => void` | Called on successful result |
| `onError` | `(error) => void` | Called on error |
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

---

### `<ResultView />`

Auto-renders charts, tables, summary text, and CSV download from a `QueryResult`:

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

#### Props

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

---

## Backend Setup

`datalogue-react` needs a backend endpoint powered by [datalogue](https://www.npmjs.com/package/datalogue):

```typescript
import { Datalogue } from 'datalogue';

const qm = new Datalogue({
  db: { type: 'postgres', connectionString: process.env.DATABASE_URL! },
  ai: { type: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY! },
  allowedTables: ['orders', 'customers', 'products'],
});

// Express
app.post('/api/query', async (req, res) => {
  const result = await qm.query(req.body.question, { userId: req.user.id });
  res.json(result);
});
```

See the [datalogue README](https://www.npmjs.com/package/datalogue) for full backend documentation.

---

## License

ISC
