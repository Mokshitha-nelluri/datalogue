import type {
  DatalogueConfig,
  QueryOptions,
  QueryResult,
  SchemaInfo,
  AIProvider,
  DBAdapter,
  DBDialect,
  ValidatorDialect,
  AuditEntry,
  PostgresConfig,
  MySQLConfig,
  MSSQLConfig,
  SQLiteConfig,
  AnthropicConfig,
  OpenAIConfig,
} from './types.js';
import { DatalogueError } from './errors.js';
import { buildPrompt, buildSuggestPrompt } from './prompt/builder.js';
import { parseAIResponse, downgradeConfidence } from './prompt/parser.js';
import { validateSQL } from './security/validator.js';
import { sanitizeDBError } from './security/sanitizer.js';
import { createAuditLogger } from './security/audit.js';
import { formatQueryResult } from './output/formatter.js';
import { ContextManager } from './context/manager.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { OpenAIProvider } from './providers/openai.js';
import { PostgresAdapter } from './adapters/postgres.js';
import { MySQLAdapter } from './adapters/mysql.js';
import { MSSQLAdapter } from './adapters/mssql.js';
import { SQLiteAdapter } from './adapters/sqlite.js';

function isDBAdapter(db: DatalogueConfig['db']): db is DBAdapter {
  return 'query' in db && 'introspect' in db && 'dialect' in db;
}

function isAIProvider(ai: DatalogueConfig['ai']): ai is AIProvider {
  return 'complete' in ai;
}

/** Map DBDialect → ValidatorDialect for node-sql-parser */
const DB_TO_VALIDATOR_DIALECT: Record<DBDialect, ValidatorDialect> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  mssql: 'MSSQL',
  sqlite: 'SQLite',
};

export class Datalogue {
  private readonly config: DatalogueConfig;
  private readonly adapter: DBAdapter;
  private readonly ai: AIProvider;
  private readonly auditLog: (entry: AuditEntry) => void;
  private readonly contextManager: ContextManager | null;
  private cachedSchema: SchemaInfo | null = null;
  // Rate limiter instance — lazily initialized on first use
  private rateLimiter: { consume(key: string): Promise<unknown> } | null = null;
  private rateLimiterReady: Promise<void> | null = null;

  constructor(config: DatalogueConfig) {
    this.config = config;
    this.adapter = this.resolveAdapter(config.db);
    this.ai = this.resolveAIProvider(config.ai);
    this.auditLog = createAuditLogger(
      config.auditLog !== false,
      config.auditLogFn,
    );
    this.contextManager = config.session
      ? new ContextManager(
          config.session.maxHistoryLength,
          config.session.ttlMinutes,
          config.session.store,
        )
      : null;

    // Lazily initialize rate limiter if configured
    if (config.rateLimit) {
      const rpm = config.rateLimit.requestsPerMinute;
      this.rateLimiterReady = (async () => {
        try {
          const mod = await import('rate-limiter-flexible');
          const RateLimiterMemory =
            mod.RateLimiterMemory ??
            (mod as unknown as { default: { RateLimiterMemory: unknown } })
              .default?.RateLimiterMemory;
          this.rateLimiter = new (
            RateLimiterMemory as new (opts: {
              points: number;
              duration: number;
            }) => { consume(key: string): Promise<unknown> }
          )({ points: rpm, duration: 60 });
        } catch {
          throw new DatalogueError(
            'rateLimit is configured but "rate-limiter-flexible" is not installed. ' +
              'Install it: npm install rate-limiter-flexible',
            'INVALID_CONFIG',
          );
        }
      })();
    }
  }

  private resolveAdapter(db: DatalogueConfig['db']): DBAdapter {
    if (isDBAdapter(db)) return db;

    switch (db.type) {
      case 'postgres':
        return new PostgresAdapter(
          (db as PostgresConfig).connectionString,
          (db as PostgresConfig).ssl,
        );
      case 'mysql':
        return new MySQLAdapter(
          (db as MySQLConfig).host,
          (db as MySQLConfig).user,
          (db as MySQLConfig).password,
          (db as MySQLConfig).database,
          (db as MySQLConfig).port,
        );
      case 'mssql':
        return new MSSQLAdapter(
          (db as MSSQLConfig).server,
          (db as MSSQLConfig).user,
          (db as MSSQLConfig).password,
          (db as MSSQLConfig).database,
          (db as MSSQLConfig).port,
          (db as MSSQLConfig).encrypt,
        );
      case 'sqlite':
        return new SQLiteAdapter((db as SQLiteConfig).filepath);
      default:
        throw new DatalogueError(
          `Unsupported database type: ${(db as { type: string }).type}`,
          'INVALID_CONFIG',
        );
    }
  }

  private resolveAIProvider(ai: DatalogueConfig['ai']): AIProvider {
    if (isAIProvider(ai)) return ai;

    switch (ai.type) {
      case 'anthropic':
        return new AnthropicProvider(
          (ai as AnthropicConfig).apiKey,
          (ai as AnthropicConfig).model,
        );
      case 'openai':
        return new OpenAIProvider(
          (ai as OpenAIConfig).apiKey,
          (ai as OpenAIConfig).model,
        );
      default:
        throw new DatalogueError(
          `Unsupported AI provider type: ${(ai as { type: string }).type}`,
          'INVALID_CONFIG',
        );
    }
  }

  private async getSchema(): Promise<SchemaInfo> {
    if (!this.cachedSchema) {
      try {
        this.cachedSchema = await this.adapter.introspect();
      } catch (err) {
        throw new DatalogueError(
          `Schema introspection failed: ${err instanceof Error ? err.message : String(err)}`,
          'SCHEMA_INTROSPECTION_FAILED',
        );
      }
    }
    return this.cachedSchema;
  }

  async query(
    naturalLanguageQuery: string,
    options?: QueryOptions,
  ): Promise<QueryResult> {
    const startTime = Date.now();
    const userId = options?.userId;

    // Hook: beforeQuery
    if (this.config.hooks?.beforeQuery) {
      await this.config.hooks.beforeQuery(naturalLanguageQuery, userId);
    }

    // Rate limit check (per userId, or 'anonymous' if no userId)
    if (this.rateLimiterReady) {
      await this.rateLimiterReady;
      const key = userId ?? 'anonymous';
      try {
        await this.rateLimiter!.consume(key);
      } catch {
        throw new DatalogueError(
          `Rate limit exceeded for ${key}. Max ${this.config.rateLimit!.requestsPerMinute} requests per minute.`,
          'RATE_LIMIT_EXCEEDED',
        );
      }
    }

    // Build system prompt with schema
    const systemPrompt = await this.buildSystemPrompt();

    // Get conversation history for multi-turn context
    const sessionId = options?.sessionId;
    const history =
      sessionId && this.contextManager
        ? await this.contextManager.getHistory(sessionId)
        : [];

    // Get AI-generated SQL
    const aiResponse = await this.ai.complete(
      systemPrompt,
      naturalLanguageQuery,
      history,
    );
    const parsed = parseAIResponse(aiResponse);

    // Validate SQL through security layer
    const validatorDialect = DB_TO_VALIDATOR_DIALECT[this.adapter.dialect];
    const validation = validateSQL(parsed.sql, {
      allowedTables: this.config.allowedTables,
      allowMutations: this.config.allowMutations ?? false,
      dialect: validatorDialect,
    });

    if (!validation.valid) {
      // Audit blocked query
      this.auditLog({
        timestamp: new Date().toISOString(),
        userId,
        naturalLanguageQuery,
        generatedSQL: parsed.sql,
        rowCount: 0,
        executionTimeMs: Date.now() - startTime,
        blocked: true,
        blockReason: validation.reason,
      });

      // Hook: onBlock
      if (this.config.hooks?.onBlock) {
        await this.config.hooks.onBlock(
          validation.reason!,
          naturalLanguageQuery,
          userId,
        );
      }

      throw new DatalogueError(
        validation.reason ?? 'SQL validation failed',
        validation.reason?.startsWith('TABLE_NOT_ALLOWED')
          ? 'TABLE_NOT_ALLOWED'
          : validation.reason === 'MUTATION_NOT_ALLOWED'
            ? 'MUTATION_NOT_ALLOWED'
            : 'SQL_INJECTION_BLOCKED',
      );
    }

    const sqlToExecute = validation.normalizedSQL ?? parsed.sql;

    // Apply rowFilter — inject WHERE clause for tenant isolation
    const sqlWithFilter = this.applyRowFilter(sqlToExecute, userId);

    // Dry-run mode: return the SQL without executing
    if (options?.dryRun) {
      const dryResult: QueryResult = {
        sql: sqlWithFilter,
        rows: [],
        summary: parsed.summary,
        confidence: parsed.confidence,
        executionTimeMs: Date.now() - startTime,
        rowCount: 0,
        dryRun: true,
      };

      this.auditLog({
        timestamp: new Date().toISOString(),
        userId,
        naturalLanguageQuery,
        generatedSQL: sqlWithFilter,
        rowCount: 0,
        executionTimeMs: dryResult.executionTimeMs,
        blocked: false,
      });

      return dryResult;
    }

    // Execute with one retry on failure
    let rows: Record<string, unknown>[];
    let retryUsed = false;
    let retryConfidence: typeof parsed.confidence | undefined;
    try {
      rows = (await this.adapter.query(sqlWithFilter)) as Record<
        string,
        unknown
      >[];
    } catch (firstErr) {
      // Retry once: sanitize error and send back to AI
      const sanitized = sanitizeDBError(
        firstErr instanceof Error ? firstErr.message : String(firstErr),
      );
      const retryMessage = `The following SQL failed with error: ${sanitized}\nOriginal question: ${naturalLanguageQuery}\nFailed SQL: ${sqlWithFilter}\nFix the SQL so it only uses columns that exist in the schema.`;

      const retryResponse = await this.ai.complete(
        systemPrompt,
        retryMessage,
        [],
      );
      const retryParsed = parseAIResponse(retryResponse);

      // Validate retry SQL
      const retryValidation = validateSQL(retryParsed.sql, {
        allowedTables: this.config.allowedTables,
        allowMutations: this.config.allowMutations ?? false,
        dialect: validatorDialect,
      });

      if (!retryValidation.valid) {
        this.auditLog({
          timestamp: new Date().toISOString(),
          userId,
          naturalLanguageQuery,
          generatedSQL: retryParsed.sql,
          rowCount: 0,
          executionTimeMs: Date.now() - startTime,
          blocked: true,
          blockReason: retryValidation.reason,
        });

        throw new DatalogueError(
          'SQL validation failed after retry',
          'SQL_INJECTION_BLOCKED',
        );
      }

      const retrySqlBase = retryValidation.normalizedSQL ?? retryParsed.sql;
      const retrySql = this.applyRowFilter(retrySqlBase, userId);

      try {
        rows = (await this.adapter.query(retrySql)) as Record<
          string,
          unknown
        >[];
      } catch {
        this.auditLog({
          timestamp: new Date().toISOString(),
          userId,
          naturalLanguageQuery,
          generatedSQL: retrySql,
          rowCount: 0,
          executionTimeMs: Date.now() - startTime,
          blocked: false,
          blockReason: 'SQL_EXECUTION_ERROR after retry',
        });

        throw new DatalogueError(
          'SQL execution failed after retry',
          'SQL_EXECUTION_ERROR',
        );
      }

      // Downgrade confidence after successful retry
      retryUsed = true;
      retryConfidence = retryParsed.confidence;
    }

    // Apply maxRowsReturned limit
    const maxRows = this.config.maxRowsReturned ?? 1000;
    const limitedRows = rows.slice(0, maxRows);

    // Determine final confidence: downgrade if retry was used
    const finalConfidence = retryUsed
      ? downgradeConfidence(retryConfidence!)
      : parsed.confidence;

    // Determine output formats (query-level overrides config-level)
    const outputFormats = options?.outputFormats ?? this.config.outputFormats;

    let result: QueryResult = formatQueryResult(
      limitedRows,
      sqlWithFilter,
      parsed.summary ?? '',
      finalConfidence,
      Date.now() - startTime,
      outputFormats,
    );

    // Hook: afterQuery
    if (this.config.hooks?.afterQuery) {
      result = await this.config.hooks.afterQuery(result, userId);
    }

    // Audit successful query
    this.auditLog({
      timestamp: new Date().toISOString(),
      userId,
      naturalLanguageQuery,
      generatedSQL: sqlWithFilter,
      rowCount: result.rowCount,
      executionTimeMs: result.executionTimeMs,
      blocked: false,
    });

    // Store conversation context for multi-turn sessions
    if (sessionId && this.contextManager) {
      await this.contextManager.addMessage(sessionId, {
        role: 'user',
        content: naturalLanguageQuery,
      });
      await this.contextManager.addMessage(sessionId, {
        role: 'assistant',
        content: result.sql,
      });
    }

    return result;
  }

  async suggestQueries(count: number = 5): Promise<string[]> {
    const schema = await this.getSchema();
    const prompt = buildSuggestPrompt(
      schema,
      this.config.allowedTables,
      count,
    );

    const raw = await this.ai.complete(prompt, 'Generate example queries.', []);

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error('not an array');
      }
      return parsed
        .filter((item): item is string => typeof item === 'string')
        .slice(0, count);
    } catch {
      throw new DatalogueError(
        'AI provider returned invalid JSON for query suggestions',
        'AI_PROVIDER_ERROR',
      );
    }
  }

  async refreshSchema(): Promise<void> {
    this.cachedSchema = null;
    await this.getSchema();
  }

  /**
   * Inject a WHERE clause for row-level tenant isolation.
   * Applied at the adapter level (not by the LLM) so it cannot be
   * bypassed by prompt injection.
   */
  private applyRowFilter(sql: string, userId?: string): string {
    if (!this.config.rowFilter) return sql;

    const col = this.config.rowFilter.column;

    if (!userId) {
      throw new DatalogueError(
        `rowFilter is configured on column "${col}" but no userId was provided in query options`,
        'INVALID_CONFIG',
      );
    }

    // Sanitize userId — only allow alphanumeric, hyphens, underscores, dots, @
    if (!/^[\w.@-]+$/.test(userId)) {
      throw new DatalogueError(
        'userId contains invalid characters for rowFilter injection',
        'INVALID_CONFIG',
      );
    }

    // Escape single quotes in userId to prevent SQL injection
    const safeUserId = userId.replace(/'/g, "''");

    // Insert WHERE clause — handles SELECT with and without existing WHERE
    const upperSql = sql.toUpperCase();
    const whereIdx = upperSql.indexOf(' WHERE ');
    const filterClause = `${col} = '${safeUserId}'`;

    if (whereIdx !== -1) {
      // Existing WHERE — prepend our filter with AND
      const insertPos = whereIdx + 7; // length of ' WHERE '
      return sql.slice(0, insertPos) + filterClause + ' AND ' + sql.slice(insertPos);
    }

    // No WHERE — insert before ORDER BY, GROUP BY, LIMIT, HAVING, UNION, or end
    const insertionPatterns = [/\sORDER\s+BY\s/i, /\sGROUP\s+BY\s/i, /\sLIMIT\s/i, /\sHAVING\s/i, /\sUNION\s/i];
    for (const pattern of insertionPatterns) {
      const match = pattern.exec(sql);
      if (match) {
        return sql.slice(0, match.index) + ` WHERE ${filterClause}` + sql.slice(match.index);
      }
    }

    // No trailing clauses — append at end
    return sql + ` WHERE ${filterClause}`;
  }

  async close(): Promise<void> {
    await this.adapter.close();
  }

  // Exposed for testing — returns the built system prompt
  async buildSystemPrompt(): Promise<string> {
    const schema = await this.getSchema();
    return buildPrompt(
      schema,
      this.adapter.dialect,
      this.config.allowedTables,
      this.config.tableDescriptions,
    );
  }
}
