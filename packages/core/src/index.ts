// ─── Public API surface ──────────────────────────────────────────────────────

// Main class
export { Datalogue } from './Datalogue.js';

// Error classes
export { DatalogueError } from './errors.js';
export type { DatalogueErrorCode } from './errors.js';

// Security
export { validateSQL, stripSQLComments } from './security/validator.js';
export { enforceAllowlist } from './security/allowlist.js';
export { sanitizeDBError } from './security/sanitizer.js';
export { createAuditLogger, logAuditEntry } from './security/audit.js';

// Output
export { generateChartSpec, rowsToCSV, formatQueryResult } from './output/formatter.js';

// Context
export { ContextManager } from './context/manager.js';

// All types
export type {
  // Config
  DatalogueConfig,
  PostgresConfig,
  MySQLConfig,
  MSSQLConfig,
  SQLiteConfig,
  AnthropicConfig,
  OpenAIConfig,

  // Extensibility
  AIProvider,
  DBAdapter,
  DatalogueHooks,

  // Core types
  DBDialect,
  OutputFormat,
  Confidence,
  QueryResult,
  QueryOptions,
  ChartSpec,
  ChartDataset,
  Message,
  SchemaInfo,
  TableInfo,
  ColumnInfo,
  AuditEntry,

  // Config sub-types
  RowFilterConfig,
  TableDescription,
  SessionConfig,
  RateLimitConfig,

  // Validator types
  ValidatorDialect,
  ValidationResult,
  ValidationOptions,
} from './types.js';
