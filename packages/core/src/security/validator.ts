import { Parser } from 'node-sql-parser';
import type { ValidationOptions, ValidationResult } from '../types.js';

const parser = new Parser();

// Data mutations — allowed when allowMutations: true
const DATA_MUTATION_TYPES = ['insert', 'update', 'delete'];

// Destructive/privilege statements — ALWAYS blocked, even with allowMutations: true.
const ALWAYS_BLOCKED_TYPES = [
  'drop',
  'truncate',
  'alter',
  'create',
  'grant',
  'revoke',
  'exec',
  'execute',
];

// System schemas that must never be queried
const BLOCKED_SCHEMAS = [
  'pg_catalog',
  'information_schema',
  'sys',
  'mysql',
  'sqlite_master',
  'sqlite_temp_master',
];

// Dangerous DB functions (filesystem, remote execution, etc.)
const BLOCKED_FUNCTIONS = [
  'pg_read_file',
  'pg_read_binary_file',
  'lo_import',
  'lo_export',
  'pg_ls_dir',
  'pg_stat_file',
  'dblink',
  'dblink_exec',
  'load_file',
  'into outfile',
  'into dumpfile',
  'xp_cmdshell',
  'sp_executesql',
  'openrowset',
  'opendatasource',
  'readfile',
  'writefile',
  'edit',
  'load_extension',
];

const MAX_SQL_LENGTH = 2000;

/**
 * Map our ValidatorDialect to node-sql-parser's database option.
 * node-sql-parser uses 'TransactSQL' not 'MSSQL'.
 */
const DIALECT_MAP: Record<string, string> = {
  PostgreSQL: 'PostgreSQL',
  MySQL: 'MySQL',
  MariaDB: 'MariaDB',
  MSSQL: 'TransactSQL',
  SQLite: 'SQLite',
};

/**
 * Strip SQL comments before parsing (injection vector).
 */
export function stripSQLComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, '') // line comments (--)
    .replace(/#[^\n]*/g, '') // MySQL line comments (#)
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .trim();
}

/**
 * Extract table names from parser.parse() result's tableList.
 * tableList entries are in the format "operation::schema::table".
 * Returns full "schema.table" when schema is present, else just "table".
 */
function extractTablesFromTableList(tableList: string[]): string[] {
  const tables: string[] = [];
  for (const entry of tableList) {
    const parts = entry.split('::');
    // parts = [operation, schema|null, table]
    const schema = parts[1] && parts[1] !== 'null' ? parts[1] : null;
    const table = parts[2];
    tables.push(schema ? `${schema}.${table}` : table);
  }
  return [...new Set(tables)];
}

/**
 * Fallback validation for dialects where node-sql-parser has limited support.
 * Conservative: blocks anything that doesn't look like a simple SELECT.
 */
function fallbackValidation(
  sql: string,
  opts: Pick<ValidationOptions, 'allowedTables' | 'allowMutations'>,
): ValidationResult {
  const trimmed = sql.trim();

  if (!/^SELECT\s/i.test(trimmed)) {
    return { valid: false, reason: 'MUTATION_NOT_ALLOWED' };
  }

  // Block multiple statements
  if (/;\s*\S/.test(trimmed)) {
    return { valid: false, reason: 'SQL_INJECTION_BLOCKED' };
  }

  // Extract table names via regex (FROM/JOIN clauses) and check allowlist
  const tablePattern = /(?:FROM|JOIN)\s+([\w.]+)/gi;
  const allowedLower = opts.allowedTables.map((t) => t.toLowerCase());
  let match;
  while ((match = tablePattern.exec(trimmed)) !== null) {
    const rawTable = match[1];
    const table = rawTable.includes('.')
      ? rawTable.split('.').pop()!
      : rawTable;
    if (!allowedLower.includes(table.toLowerCase())) {
      return { valid: false, reason: `TABLE_NOT_ALLOWED: ${rawTable}` };
    }
  }

  return { valid: true, normalizedSQL: trimmed };
}

/**
 * Validate SQL using AST parsing (node-sql-parser).
 * Enforces: statement type blocking, system schema blocking,
 * dangerous function blocking, table allowlist, query length limits,
 * comment stripping, hex-string rejection, and multi-statement blocking.
 */
export function validateSQL(
  sql: string,
  opts: ValidationOptions,
): ValidationResult {
  // 0a. Length check
  if (sql.length > MAX_SQL_LENGTH) {
    return { valid: false, reason: 'QUERY_TOO_LONG' };
  }

  // 0b. Strip comments
  const cleanedSQL = stripSQLComments(sql);

  // 0c. Reject hex-encoded strings (obfuscation vector)
  if (/0x[0-9a-fA-F]{2,}/i.test(cleanedSQL)) {
    return {
      valid: false,
      reason: 'SQL_INJECTION_BLOCKED: hex-encoded string detected',
    };
  }

  // 0d. Blocked function check (pre-parse, catches string matches)
  const sqlLower = cleanedSQL.toLowerCase();
  for (const fn of BLOCKED_FUNCTIONS) {
    if (sqlLower.includes(fn)) {
      return {
        valid: false,
        reason: `SQL_INJECTION_BLOCKED: dangerous function call (${fn})`,
      };
    }
  }

  // 1. Parse
  const parserDialect = DIALECT_MAP[opts.dialect] ?? opts.dialect;
  let parseResult: ReturnType<typeof parser.parse>;
  try {
    parseResult = parser.parse(cleanedSQL, { database: parserDialect });
  } catch {
    // MariaDB: retry as MySQL dialect (covers 99% of cases), then fallback
    if (opts.dialect === 'MariaDB') {
      try {
        parseResult = parser.parse(cleanedSQL, { database: 'MySQL' });
      } catch {
        return fallbackValidation(cleanedSQL, opts);
      }
    } else if (opts.dialect === 'MSSQL' || opts.dialect === 'SQLite') {
      // For MSSQL/SQLite where parser support is shaky, try fallback
      return fallbackValidation(cleanedSQL, opts);
    } else {
      return { valid: false, reason: 'SQL_PARSE_FAILED' };
    }
  }

  const ast = parseResult.ast;
  const statements = Array.isArray(ast) ? ast : [ast];

  // 2. Block multiple statements (common injection vector)
  if (statements.length > 1) {
    return { valid: false, reason: 'SQL_INJECTION_BLOCKED' };
  }

  const stmt = statements[0] as { type?: string };

  // 3a. Always block destructive/privilege statements
  const stmtType = stmt.type?.toLowerCase() ?? '';
  if (ALWAYS_BLOCKED_TYPES.includes(stmtType)) {
    return {
      valid: false,
      reason: 'SQL_INJECTION_BLOCKED: destructive statement type',
    };
  }

  // 3b. Block data mutations unless allowMutations is true
  if (!opts.allowMutations && DATA_MUTATION_TYPES.includes(stmtType)) {
    return { valid: false, reason: 'MUTATION_NOT_ALLOWED' };
  }

  // 4. Extract all referenced table names
  const referencedTables = extractTablesFromTableList(
    parseResult.tableList ?? [],
  );

  // 5. Block system schema access
  for (const table of referencedTables) {
    const parts = table.split('.');
    if (parts.length > 1) {
      const schema = parts[0].toLowerCase();
      if (BLOCKED_SCHEMAS.includes(schema)) {
        return {
          valid: false,
          reason: `TABLE_NOT_ALLOWED: system schema access blocked (${table})`,
        };
      }
    }
  }

  // 6. Enforce table allowlist
  const allowedLower = opts.allowedTables.map((t) => t.toLowerCase());
  for (const table of referencedTables) {
    const tableName = table.includes('.') ? table.split('.').pop()! : table;
    if (!allowedLower.includes(tableName.toLowerCase())) {
      return { valid: false, reason: `TABLE_NOT_ALLOWED: ${table}` };
    }
  }

  // 7. Regenerate SQL from AST (prevents obfuscation surviving validation)
  const normalizedSQL = parser.sqlify(ast, { database: parserDialect });
  return { valid: true, normalizedSQL };
}
