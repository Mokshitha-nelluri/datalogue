import type { ChartSpec, Confidence, OutputFormat, QueryResult } from '../types.js';
/**
 * Detect the best chart type from row data and generate a ChartSpec.
 *
 * Rules:
 * - Time-series (column name or date-parseable values) → line
 * - Percentage data (sums to ~100 or ~1) and ≤8 rows → pie
 * - Otherwise → bar
 * - Returns null if data has no usable string + numeric column pair
 */
export declare function generateChartSpec(rows: Record<string, unknown>[]): ChartSpec | null;
/**
 * Convert rows to RFC 4180–compliant CSV.
 * Quotes fields containing commas, double quotes, or newlines.
 */
export declare function rowsToCSV(rows: Record<string, unknown>[]): string;
/**
 * Build a QueryResult with optional output formats (chartSpec, csv).
 * If no formats are specified, only rows/sql/summary/confidence are populated.
 */
export declare function formatQueryResult(rows: Record<string, unknown>[], sql: string, summary: string, confidence: Confidence, executionTimeMs: number, outputFormats?: OutputFormat[]): QueryResult;
//# sourceMappingURL=formatter.d.ts.map