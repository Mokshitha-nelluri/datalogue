/**
 * Default audit log function — writes structured JSON to stdout.
 */
function defaultAuditLogFn(entry) {
    const output = JSON.stringify(entry);
    // Use process.stdout directly to avoid console.log formatting
    process.stdout.write(output + '\n');
}
/**
 * Create an audit logger.
 * If `customFn` is provided, it will be used instead of the default.
 * If `enabled` is false, returns a no-op.
 */
export function createAuditLogger(enabled = true, customFn) {
    if (!enabled) {
        return () => { };
    }
    return customFn ?? defaultAuditLogFn;
}
/**
 * Log a single audit entry.
 * Convenience wrapper — use `createAuditLogger` for repeated use.
 */
export function logAuditEntry(entry, customFn) {
    const logger = customFn ?? defaultAuditLogFn;
    logger(entry);
}
//# sourceMappingURL=audit.js.map