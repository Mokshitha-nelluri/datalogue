import type { ValidationOptions, ValidationResult } from '../types.js';
/**
 * Strip SQL comments before parsing (injection vector).
 */
export declare function stripSQLComments(sql: string): string;
/**
 * Validate SQL using AST parsing (node-sql-parser).
 * Enforces: statement type blocking, system schema blocking,
 * dangerous function blocking, table allowlist, query length limits,
 * comment stripping, hex-string rejection, and multi-statement blocking.
 */
export declare function validateSQL(sql: string, opts: ValidationOptions): ValidationResult;
//# sourceMappingURL=validator.d.ts.map