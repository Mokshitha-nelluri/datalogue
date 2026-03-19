import { describe, it, expect } from 'vitest';
import { generateChartSpec, rowsToCSV, formatQueryResult } from '../../src/output/formatter.js';
// ─── generateChartSpec ───────────────────────────────────────────────────────
describe('generateChartSpec', () => {
    it('returns null for empty rows', () => {
        expect(generateChartSpec([])).toBeNull();
    });
    it('returns null when no numeric columns exist', () => {
        const rows = [
            { name: 'Alice', city: 'NYC' },
            { name: 'Bob', city: 'LA' },
        ];
        expect(generateChartSpec(rows)).toBeNull();
    });
    it('returns null when no string columns exist', () => {
        const rows = [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
        ];
        expect(generateChartSpec(rows)).toBeNull();
    });
    it('produces a bar chart for categorical data', () => {
        const rows = [
            { category: 'A', count: 10 },
            { category: 'B', count: 20 },
            { category: 'C', count: 30 },
        ];
        const spec = generateChartSpec(rows);
        expect(spec).not.toBeNull();
        expect(spec.type).toBe('bar');
        expect(spec.data.labels).toEqual(['A', 'B', 'C']);
        expect(spec.data.datasets[0].label).toBe('count');
        expect(spec.data.datasets[0].data).toEqual([10, 20, 30]);
    });
    it('produces a line chart for time-series data (column name detection)', () => {
        const rows = [
            { month: 'Jan', revenue: 100 },
            { month: 'Feb', revenue: 200 },
            { month: 'Mar', revenue: 300 },
        ];
        const spec = generateChartSpec(rows);
        expect(spec).not.toBeNull();
        expect(spec.type).toBe('line');
    });
    it('produces a line chart for date-parseable label values', () => {
        const rows = [
            { label: '2024-01-01', sales: 50 },
            { label: '2024-02-01', sales: 75 },
            { label: '2024-03-01', sales: 120 },
        ];
        const spec = generateChartSpec(rows);
        expect(spec).not.toBeNull();
        expect(spec.type).toBe('line');
    });
    it('produces a pie chart for small percentage data (sums to ~100)', () => {
        const rows = [
            { segment: 'Desktop', share: 55 },
            { segment: 'Mobile', share: 35 },
            { segment: 'Tablet', share: 10 },
        ];
        const spec = generateChartSpec(rows);
        expect(spec).not.toBeNull();
        expect(spec.type).toBe('pie');
    });
    it('produces a pie chart for data summing to ~1.0 (fractional)', () => {
        const rows = [
            { source: 'Organic', ratio: 0.6 },
            { source: 'Paid', ratio: 0.3 },
            { source: 'Direct', ratio: 0.1 },
        ];
        const spec = generateChartSpec(rows);
        expect(spec).not.toBeNull();
        expect(spec.type).toBe('pie');
    });
    it('does not produce pie when > 8 rows', () => {
        const rows = Array.from({ length: 10 }, (_, i) => ({
            item: `item${i}`,
            percent: 10,
        }));
        const spec = generateChartSpec(rows);
        expect(spec).not.toBeNull();
        // Even though sums to 100, too many rows → bar
        expect(spec.type).toBe('bar');
    });
    it('detects time series by percentage-like column name (created_at)', () => {
        const rows = [
            { created_at: '2024-01', value: 5 },
            { created_at: '2024-02', value: 10 },
        ];
        const spec = generateChartSpec(rows);
        expect(spec.type).toBe('line');
    });
    it('handles numeric-string values (coercible)', () => {
        const rows = [
            { name: 'A', amount: '100' },
            { name: 'B', amount: '200' },
        ];
        const spec = generateChartSpec(rows);
        expect(spec).not.toBeNull();
        expect(spec.type).toBe('bar');
        expect(spec.data.datasets[0].data).toEqual([100, 200]);
    });
});
// ─── rowsToCSV ───────────────────────────────────────────────────────────────
describe('rowsToCSV', () => {
    it('returns empty string for empty rows', () => {
        expect(rowsToCSV([])).toBe('');
    });
    it('produces header + rows for simple data', () => {
        const rows = [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
        ];
        const csv = rowsToCSV(rows);
        const lines = csv.split('\n');
        expect(lines[0]).toBe('id,name');
        expect(lines[1]).toBe('1,Alice');
        expect(lines[2]).toBe('2,Bob');
    });
    it('quotes values containing commas', () => {
        const rows = [{ description: 'hello, world', count: 1 }];
        const csv = rowsToCSV(rows);
        expect(csv).toContain('"hello, world"');
    });
    it('quotes values containing double quotes (escaped)', () => {
        const rows = [{ note: 'he said "hi"', count: 1 }];
        const csv = rowsToCSV(rows);
        expect(csv).toContain('"he said ""hi"""');
    });
    it('quotes values containing newlines', () => {
        const rows = [{ text: 'line1\nline2', id: 1 }];
        const csv = rowsToCSV(rows);
        expect(csv).toContain('"line1\nline2"');
    });
    it('handles null and undefined values', () => {
        const rows = [{ a: null, b: undefined, c: 'ok' }];
        const csv = rowsToCSV(rows);
        expect(csv).toContain(',,ok');
    });
});
// ─── formatQueryResult ───────────────────────────────────────────────────────
describe('formatQueryResult', () => {
    const baseRows = [
        { category: 'A', count: 10 },
        { category: 'B', count: 20 },
    ];
    it('returns rows by default', () => {
        const result = formatQueryResult(baseRows, 'SELECT ...', 'summary', 'high', 100);
        expect(result.rows).toEqual(baseRows);
        expect(result.sql).toBe('SELECT ...');
        expect(result.summary).toBe('summary');
        expect(result.confidence).toBe('high');
        expect(result.executionTimeMs).toBe(100);
        expect(result.rowCount).toBe(2);
    });
    it('includes chartSpec when chartSpec format requested', () => {
        const result = formatQueryResult(baseRows, 'SQL', 's', 'high', 10, ['chartSpec']);
        expect(result.chartSpec).toBeDefined();
        expect(result.chartSpec.type).toBe('bar');
    });
    it('includes csv when csv format requested', () => {
        const result = formatQueryResult(baseRows, 'SQL', 's', 'high', 10, ['csv']);
        expect(result.csv).toBeDefined();
        expect(result.csv).toContain('category,count');
    });
    it('includes all formats together', () => {
        const result = formatQueryResult(baseRows, 'SQL', 's', 'high', 10, ['rows', 'summary', 'chartSpec', 'csv', 'sql']);
        expect(result.rows).toBeDefined();
        expect(result.summary).toBe('s');
        expect(result.chartSpec).toBeDefined();
        expect(result.csv).toBeDefined();
        expect(result.sql).toBe('SQL');
    });
    it('omits chartSpec when not in requested formats', () => {
        const result = formatQueryResult(baseRows, 'SQL', 's', 'high', 10, ['rows']);
        expect(result.chartSpec).toBeUndefined();
        expect(result.csv).toBeUndefined();
    });
});
//# sourceMappingURL=formatter.test.js.map