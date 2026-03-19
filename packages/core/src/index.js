// ─── Public API surface ──────────────────────────────────────────────────────
// Main class
export { Datalogue } from './Datalogue.js';
// Error classes
export { DatalogueError } from './errors.js';
// Security
export { validateSQL, stripSQLComments } from './security/validator.js';
export { enforceAllowlist } from './security/allowlist.js';
export { sanitizeDBError } from './security/sanitizer.js';
export { createAuditLogger, logAuditEntry } from './security/audit.js';
// Output
export { generateChartSpec, rowsToCSV, formatQueryResult } from './output/formatter.js';
// Context
export { ContextManager } from './context/manager.js';
//# sourceMappingURL=index.js.map