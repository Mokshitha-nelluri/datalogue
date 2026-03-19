import { describe, it, expect, vi } from 'vitest';
import { Datalogue } from '../../src/Datalogue.js';
import { DatalogueError } from '../../src/errors.js';
function createMockAdapter(schema = {
    tables: [
        {
            name: 'orders',
            columns: [
                { name: 'id', type: 'integer', nullable: false, isPrimaryKey: true, isForeignKey: false },
                { name: 'total', type: 'numeric', nullable: true, isPrimaryKey: false, isForeignKey: false },
                { name: 'category', type: 'text', nullable: false, isPrimaryKey: false, isForeignKey: false },
            ],
        },
    ],
    dialect: 'postgres',
}) {
    return {
        dialect: 'postgres',
        query: vi.fn().mockResolvedValue([
            { id: 1, total: 100, category: 'A' },
            { id: 2, total: 200, category: 'B' },
        ]),
        introspect: vi.fn().mockResolvedValue(schema),
        close: vi.fn().mockResolvedValue(undefined),
    };
}
const VALID_RESPONSE = `EXPLANATION: Returns orders.
CONFIDENCE: HIGH
SQL:
SELECT id, total, category FROM orders`;
function createMockAI(response = VALID_RESPONSE) {
    return {
        complete: vi.fn().mockResolvedValue(response),
    };
}
describe('Day 4 Integration — Output Formatting', () => {
    it('includes chartSpec when outputFormats includes chartSpec', async () => {
        const qm = new Datalogue({
            db: createMockAdapter(),
            ai: createMockAI(),
            allowedTables: ['orders'],
            auditLog: false,
        });
        const result = await qm.query('show orders', { outputFormats: ['chartSpec'] });
        expect(result.chartSpec).toBeDefined();
        expect(result.chartSpec.type).toBe('bar');
        expect(result.chartSpec.data.labels).toEqual(['A', 'B']);
    });
    it('includes csv when outputFormats includes csv', async () => {
        const qm = new Datalogue({
            db: createMockAdapter(),
            ai: createMockAI(),
            allowedTables: ['orders'],
            auditLog: false,
        });
        const result = await qm.query('show orders', { outputFormats: ['csv'] });
        expect(result.csv).toBeDefined();
        expect(result.csv).toContain('id,total,category');
        expect(result.csv).toContain('1,100,A');
    });
    it('omits chartSpec and csv when not requested', async () => {
        const qm = new Datalogue({
            db: createMockAdapter(),
            ai: createMockAI(),
            allowedTables: ['orders'],
            auditLog: false,
        });
        const result = await qm.query('show orders');
        expect(result.chartSpec).toBeUndefined();
        expect(result.csv).toBeUndefined();
    });
    it('uses config-level outputFormats as default', async () => {
        const qm = new Datalogue({
            db: createMockAdapter(),
            ai: createMockAI(),
            allowedTables: ['orders'],
            auditLog: false,
            outputFormats: ['csv', 'chartSpec'],
        });
        const result = await qm.query('show orders');
        expect(result.csv).toBeDefined();
        expect(result.chartSpec).toBeDefined();
    });
});
describe('Day 4 Integration — Confidence Downgrade on Retry', () => {
    it('downgrades confidence from high to medium after successful retry', async () => {
        const adapter = createMockAdapter();
        adapter.query
            .mockRejectedValueOnce(new Error('column "revenue" does not exist'))
            .mockResolvedValueOnce([{ id: 1, total: 100, category: 'A' }]);
        const retryResponse = `EXPLANATION: Fixed query.
CONFIDENCE: HIGH
SQL:
SELECT id, total, category FROM orders`;
        const ai = createMockAI('');
        ai.complete
            .mockResolvedValueOnce(VALID_RESPONSE)
            .mockResolvedValueOnce(retryResponse);
        const qm = new Datalogue({
            db: adapter,
            ai,
            allowedTables: ['orders'],
            auditLog: false,
        });
        const result = await qm.query('show revenue');
        // HIGH should be downgraded to MEDIUM on retry
        expect(result.confidence).toBe('medium');
    });
    it('downgrades confidence from medium to low after successful retry', async () => {
        const adapter = createMockAdapter();
        adapter.query
            .mockRejectedValueOnce(new Error('column "x" does not exist'))
            .mockResolvedValueOnce([{ id: 1, total: 100, category: 'A' }]);
        const retryResponse = `EXPLANATION: Fixed.
CONFIDENCE: MEDIUM
SQL:
SELECT id, total, category FROM orders`;
        const ai = createMockAI('');
        ai.complete
            .mockResolvedValueOnce(VALID_RESPONSE)
            .mockResolvedValueOnce(retryResponse);
        const qm = new Datalogue({
            db: adapter,
            ai,
            allowedTables: ['orders'],
            auditLog: false,
        });
        const result = await qm.query('show x');
        expect(result.confidence).toBe('low');
    });
});
describe('Day 4 Integration — Multi-turn Context', () => {
    it('passes session history to AI on successive queries', async () => {
        const ai = createMockAI();
        const qm = new Datalogue({
            db: createMockAdapter(),
            ai,
            allowedTables: ['orders'],
            auditLog: false,
            session: { maxHistoryLength: 10, ttlMinutes: 60 },
        });
        // First query in session
        await qm.query('show all orders', { sessionId: 'sess1' });
        const firstCall = ai.complete.mock.calls[0];
        // First call should have empty history
        expect(firstCall[2]).toEqual([]);
        // Second query in session
        await qm.query('now filter by category A', { sessionId: 'sess1' });
        const secondCall = ai.complete.mock.calls[1];
        // Should now have history from first turn
        expect(secondCall[2].length).toBeGreaterThan(0);
        expect(secondCall[2][0].role).toBe('user');
    });
    it('does not share context across different sessions', async () => {
        const ai = createMockAI();
        const qm = new Datalogue({
            db: createMockAdapter(),
            ai,
            allowedTables: ['orders'],
            auditLog: false,
            session: { maxHistoryLength: 10, ttlMinutes: 60 },
        });
        await qm.query('show orders', { sessionId: 'sess1' });
        await qm.query('show totals', { sessionId: 'sess2' });
        const sess2Call = ai.complete.mock.calls[1];
        // sess2 should have empty history (different session)
        expect(sess2Call[2]).toEqual([]);
    });
    it('does not use context when no sessionId is provided', async () => {
        const ai = createMockAI();
        const qm = new Datalogue({
            db: createMockAdapter(),
            ai,
            allowedTables: ['orders'],
            auditLog: false,
            session: { maxHistoryLength: 10, ttlMinutes: 60 },
        });
        await qm.query('first query');
        await qm.query('second query');
        const secondCall = ai.complete.mock.calls[1];
        expect(secondCall[2]).toEqual([]);
    });
});
//# sourceMappingURL=day4-integration.test.js.map