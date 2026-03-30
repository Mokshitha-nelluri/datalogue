# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-03-20

### Added

#### `datalogue` (core)
- Natural language to SQL conversion with AST-level security validation via `node-sql-parser`
- Database adapters: PostgreSQL (`pg`), MySQL (`mysql2`), SQLite (`better-sqlite3`), MS SQL Server (`mssql`)
- AI providers: Anthropic Claude, OpenAI, plus custom `AIProvider` interface
- Smart output formatting — automatic chart type inference (bar, line, pie), CSV export, natural language summaries
- Multi-turn conversation support with bounded in-memory history and pluggable `SessionStore`
- Row-level security via `rowFilter` config — applied at the adapter level, not by the LLM
- Schema descriptions (business glossary) via `tableDescriptions` for improved SQL accuracy
- Dry-run mode — preview generated SQL without executing
- Query suggestions — generate example questions from schema via `suggestQueries()`
- Hooks API — `beforeQuery`, `afterQuery`, `onBlock` for custom middleware
- Structured audit logging with configurable destination
- AST-level SQL validation: table allowlist, statement type blocking, system schema blocking, dangerous function blocking, multi-statement rejection, comment stripping, hex-encoded string rejection, query length limit, SQL regeneration from AST
- DB error sanitization before LLM retry
- Confidence scoring (high / medium / low) with automatic downgrade on retry
- Full TypeScript strict mode, dual ESM + CJS output

#### `datalogue-react`
- `<QueryBox />` — drop-in chat interface with query suggestions, dry-run toggle, confidence badges, light/dark theme
- `<ResultView />` — tabbed result display with built-in SVG charts (bar, line, pie), data table, SQL view, CSV download
- Fully customizable via render props (`renderMessage`, `renderInput`, `renderChart`), style overrides, and className

#### Infrastructure
- pnpm monorepo with workspace packages
- Vitest test suite (196 tests, 80%+ coverage)
- TypeScript strict mode across all packages
- tsup build with dual ESM/CJS + declaration files
- GitHub Actions CI (test + typecheck on every push/PR)
- GitHub Actions release workflow (publish to npm on version tags)
- Changesets for semver versioning
