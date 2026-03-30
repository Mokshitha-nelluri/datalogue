---
'datalogue': minor
'datalogue-react': minor
---

Initial release of Datalogue v0.1.0

### datalogue
- Natural language to SQL conversion with AST-level security validation
- Support for PostgreSQL, MySQL, SQLite, and MS SQL Server
- Anthropic Claude and OpenAI provider support, plus custom AIProvider interface
- Smart output formatting: automatic chart type inference (bar, line, pie), CSV, summary
- Multi-turn conversation support with pluggable SessionStore
- Row-level security via rowFilter config
- Schema descriptions (business glossary) for improved SQL accuracy
- Dry-run mode for SQL preview without execution
- Query suggestions generation from schema
- Hooks API (beforeQuery, afterQuery, onBlock)
- Structured audit logging
- Full TypeScript strict mode with complete type exports

### datalogue-react
- `<QueryBox />` — drop-in chat interface with suggestions, dry-run toggle, confidence badges
- `<ResultView />` — auto-renders charts (bar, line, pie via SVG), tables, summary, CSV download
- Light and dark theme support
- Fully customizable via render props and style overrides
