import type { AuditEntry } from '../types.js';

/**
 * Default audit log function — writes structured JSON to stdout.
 */
function defaultAuditLogFn(entry: AuditEntry): void {
  const output = JSON.stringify(entry);
  // Use process.stdout directly to avoid console.log formatting
  process.stdout.write(output + '\n');
}

/**
 * Create an audit logger.
 * If `customFn` is provided, it will be used instead of the default.
 * If `enabled` is false, returns a no-op.
 */
export function createAuditLogger(
  enabled: boolean = true,
  customFn?: (entry: AuditEntry) => void,
): (entry: AuditEntry) => void {
  if (!enabled) {
    return () => {};
  }
  return customFn ?? defaultAuditLogFn;
}

/**
 * Log a single audit entry.
 * Convenience wrapper — use `createAuditLogger` for repeated use.
 */
export function logAuditEntry(
  entry: AuditEntry,
  customFn?: (entry: AuditEntry) => void,
): void {
  const logger = customFn ?? defaultAuditLogFn;
  logger(entry);
}
