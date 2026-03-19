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
export declare function sanitizeDBError(rawError: string): string;
//# sourceMappingURL=sanitizer.d.ts.map