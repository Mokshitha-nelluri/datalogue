const MAX_SANITIZED_LENGTH = 200;

const GENERIC_MESSAGE =
  'SQL execution failed — check column and table names';

/**
 * Patterns that indicate sensitive information we must strip.
 */
const SENSITIVE_PATTERNS: RegExp[] = [
  // Connection strings (postgres://, mysql://, mssql://, etc.)
  /\b\w+:\/\/[^\s]+/gi,
  // IP addresses with optional port
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b/g,
  // File paths (Unix and Windows)
  /(?:\/[\w.-]+){2,}/g,
  /[A-Z]:\\[\w\\.-]+/gi,
  // Port numbers in "port NNNN" context
  /\bport\s+\d+\b/gi,
  // Quoted data values that may appear in constraint violations
  /\bvalue\s*=\s*'[^']*'/gi,
  /\bvalue\s*=\s*"[^"]*"/gi,
  // Key=Value patterns that may leak data
  /\b(?:password|host|user|server|database)\s*=\s*\S+/gi,
];

/**
 * Sanitize a raw DB error message before sending to the LLM.
 *
 * Rules from the brief:
 * - Extract only the error type and the problematic identifier
 * - Strip connection strings, file paths, IP addresses, port numbers
 * - Strip data values from constraint violation messages
 * - Cap to 200 characters
 * - If not safely sanitizable, return a generic message
 */
export function sanitizeDBError(rawError: string): string {
  if (!rawError || rawError.trim().length === 0) {
    return GENERIC_MESSAGE;
  }

  let sanitized = rawError;

  // Strip sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  // Collapse multiple [REDACTED] in a row
  sanitized = sanitized.replace(/(\[REDACTED\]\s*)+/g, '[REDACTED] ');

  // Trim whitespace
  sanitized = sanitized.trim();

  // If nothing useful remains after sanitization, return generic
  if (
    sanitized.length === 0 ||
    sanitized === '[REDACTED]' ||
    sanitized === '[REDACTED] '
  ) {
    return GENERIC_MESSAGE;
  }

  // Cap length
  if (sanitized.length > MAX_SANITIZED_LENGTH) {
    sanitized = sanitized.substring(0, MAX_SANITIZED_LENGTH - 3) + '...';
  }

  return sanitized;
}
