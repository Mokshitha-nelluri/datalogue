import type { AuditEntry } from '../types.js';
/**
 * Create an audit logger.
 * If `customFn` is provided, it will be used instead of the default.
 * If `enabled` is false, returns a no-op.
 */
export declare function createAuditLogger(enabled?: boolean, customFn?: (entry: AuditEntry) => void): (entry: AuditEntry) => void;
/**
 * Log a single audit entry.
 * Convenience wrapper — use `createAuditLogger` for repeated use.
 */
export declare function logAuditEntry(entry: AuditEntry, customFn?: (entry: AuditEntry) => void): void;
//# sourceMappingURL=audit.d.ts.map