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
export function generateChartSpec(
  rows: Record<string, unknown>[],
): ChartSpec | null {
  if (!rows.length) return null;

  const columns = Object.keys(rows[0]);
  const numericColumns = columns.filter((col) =>
    rows.every(
      (row) => typeof row[col] === 'number' || !isNaN(Number(row[col])),
    ),
  );
  const stringColumns = columns.filter((col) => !numericColumns.includes(col));

  if (!stringColumns.length || !numericColumns.length) return null;

  const labelCol = stringColumns[0];
  const valueCol = numericColumns[0];

  // Time-series detection by column name
  const timeSeriesNamePattern =
    /date|month|year|week|day|time|created|updated|ts|period|quarter/i;
  const isTimeSeriesByName = timeSeriesNamePattern.test(labelCol);

  // Time-series detection by value parseability
  const isTimeSeriesByValue =
    rows.length > 1 &&
    rows.every((row) => {
      const val = row[labelCol];
      if (val instanceof Date) return true;
      if (typeof val === 'string') return !isNaN(Date.parse(val));
      return false;
    });
  const isTimeSeries = isTimeSeriesByName || isTimeSeriesByValue;

  // Percentage detection by column name
  const percentNamePattern =
    /percent|share|ratio|pct|proportion|pct_change|fraction/i;
  const hasPercentageByName = percentNamePattern.test(valueCol);

  // Percentage detection by values summing to ~100 or ~1
  const values = rows.map((r) => Number(r[valueCol]));
  const sum = values.reduce((a, b) => a + b, 0);
  const hasPercentageByValue =
    Math.abs(sum - 100) < 1 || Math.abs(sum - 1) < 0.01;
  const hasPercentage = hasPercentageByName || hasPercentageByValue;

  const isSmallSet = rows.length <= 8;

  let type: ChartSpec['type'] = 'bar';
  if (isTimeSeries) type = 'line';
  else if (hasPercentage && isSmallSet) type = 'pie';

  return {
    type,
    data: {
      labels: rows.map((r) => String(r[labelCol])),
      datasets: [
        {
          label: valueCol,
          data: rows.map((r) => Number(r[valueCol])),
        },
      ],
    },
  };
}

/**
 * Convert rows to RFC 4180–compliant CSV.
 * Quotes fields containing commas, double quotes, or newlines.
 */
export function rowsToCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';

  const columns = Object.keys(rows[0]);

  function escapeField(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const header = columns.join(',');
  const body = rows
    .map((row) => columns.map((col) => escapeField(row[col])).join(','))
    .join('\n');

  return `${header}\n${body}`;
}

/**
 * Build a QueryResult with optional output formats (chartSpec, csv).
 * If no formats are specified, only rows/sql/summary/confidence are populated.
 */
export function formatQueryResult(
  rows: Record<string, unknown>[],
  sql: string,
  summary: string,
  confidence: Confidence,
  executionTimeMs: number,
  outputFormats?: OutputFormat[],
): QueryResult {
  const result: QueryResult = {
    sql,
    rows,
    summary,
    confidence,
    executionTimeMs,
    rowCount: rows.length,
  };

  if (!outputFormats || outputFormats.length === 0) {
    return result;
  }

  if (outputFormats.includes('chartSpec')) {
    result.chartSpec = generateChartSpec(rows) ?? undefined;
  }

  if (outputFormats.includes('csv')) {
    result.csv = rowsToCSV(rows);
  }

  return result;
}
