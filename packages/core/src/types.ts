// ─── Database configs ────────────────────────────────────────────────────────

export interface PostgresConfig {
  type: 'postgres';
  connectionString: string;
  ssl?: boolean;
}

export interface MySQLConfig {
  type: 'mysql';
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
}

export interface SQLiteConfig {
  type: 'sqlite';
  filepath: string;
}

export interface MSSQLConfig {
  type: 'mssql';
  server: string;
  port?: number;
  user: string;
  password: string;
  database: string;
  encrypt?: boolean;
}

// ─── AI provider configs ─────────────────────────────────────────────────────

export interface AnthropicConfig {
  type: 'anthropic';
  apiKey: string;
  model?: string;
}

export interface OpenAIConfig {
  type: 'openai';
  apiKey: string;
  model?: string;
}

// ─── Extensibility interfaces ────────────────────────────────────────────────

export interface AIProvider {
  complete(
    systemPrompt: string,
    userMessage: string,
    history: Message[],
  ): Promise<string>;
}

export interface DBAdapter {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
  introspect(): Promise<SchemaInfo>;
  dialect: DBDialect;
  close(): Promise<void>;
}

// ─── Core types ──────────────────────────────────────────────────────────────

export type DBDialect = 'postgres' | 'mysql' | 'mariadb' | 'mssql' | 'sqlite';

export type OutputFormat = 'rows' | 'summary' | 'chartSpec' | 'sql' | 'csv';

export type Confidence = 'high' | 'medium' | 'low';

export interface QueryResult {
  sql: string;
  rows: Record<string, unknown>[];
  summary?: string;
  chartSpec?: ChartSpec;
  csv?: string;
  confidence: Confidence;
  executionTimeMs: number;
  rowCount: number;
  dryRun?: boolean;
}

export interface ChartSpec {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'table';
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
  options?: Record<string, unknown>;
}

export interface ChartDataset {
  label: string;
  data: number[];
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface SchemaInfo {
  tables: TableInfo[];
  dialect: DBDialect;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: { table: string; column: string };
}

export interface AuditEntry {
  timestamp: string;
  userId?: string;
  naturalLanguageQuery: string;
  generatedSQL: string;
  rowCount: number;
  executionTimeMs: number;
  blocked: boolean;
  blockReason?: string;
}

// ─── Row filter config ───────────────────────────────────────────────────────

export interface RowFilterConfig {
  column: string;
}

// ─── Table descriptions (business glossary) ──────────────────────────────────

export interface TableDescription {
  description?: string;
  columns?: Record<string, string>;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export interface DatalogueHooks {
  beforeQuery?: (query: string, userId?: string) => Promise<void>;
  afterQuery?: (
    result: QueryResult,
    userId?: string,
  ) => Promise<QueryResult>;
  onBlock?: (reason: string, query: string, userId?: string) => Promise<void>;
}

// ─── Session store interface ─────────────────────────────────────────────────

export interface SessionStore {
  get(sessionId: string): Promise<Message[] | undefined>;
  set(sessionId: string, messages: Message[], ttlMs?: number): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

// ─── Session config ──────────────────────────────────────────────────────────

export interface SessionConfig {
  maxHistoryLength?: number;
  ttlMinutes?: number;
  store?: SessionStore;
}

// ─── Rate limit config ───────────────────────────────────────────────────────

export interface RateLimitConfig {
  requestsPerMinute: number;
}

// ─── Main config ─────────────────────────────────────────────────────────────

export interface DatalogueConfig {
  db: PostgresConfig | MySQLConfig | MSSQLConfig | SQLiteConfig | DBAdapter;
  ai: AnthropicConfig | OpenAIConfig | AIProvider;
  allowedTables: string[];
  allowMutations?: boolean;
  maxRowsReturned?: number;
  rowFilter?: RowFilterConfig;
  tableDescriptions?: Record<string, TableDescription>;
  outputFormats?: OutputFormat[];
  auditLog?: boolean;
  auditLogFn?: (entry: AuditEntry) => void;
  rateLimit?: RateLimitConfig;
  session?: SessionConfig;
  hooks?: DatalogueHooks;
}

// ─── Query options ───────────────────────────────────────────────────────────

export interface QueryOptions {
  userId?: string;
  sessionId?: string;
  outputFormats?: OutputFormat[];
  dryRun?: boolean;
}

// ─── Validator types ─────────────────────────────────────────────────────────

export type ValidatorDialect =
  | 'PostgreSQL'
  | 'MySQL'
  | 'MariaDB'
  | 'MSSQL'
  | 'SQLite';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  normalizedSQL?: string;
}

export interface ValidationOptions {
  allowedTables: string[];
  allowMutations: boolean;
  dialect: ValidatorDialect;
}
