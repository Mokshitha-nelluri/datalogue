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
            ],
        },
        {
            name: 'customers',
            columns: [
                { name: 'id', type: 'integer', nullable: false, isPrimaryKey: true, isForeignKey: false },
                { name: 'name', type: 'text', nullable: false, isPrimaryKey: false, isForeignKey: false },
            ],
        },
    ],
    dialect: 'postgres',
}) {
    return {
        dialect: 'postgres',
        query: vi.fn().mockResolvedValue([
            { id: 1, total: 100 },
            { id: 2, total: 200 },
        ]),
        introspect: vi.fn().mockResolvedValue(schema),
        close: vi.fn().mockResolvedValue(undefined),
    };
}
function createMockAI(response) {
    return {
        complete: vi.fn().mockResolvedValue(response),
    };
}
// A well-formed AI response (EXPLANATION & CONFIDENCE must precede SQL — parser takes everything after SQL: as the query)
const VALID_AI_RESPONSE = `EXPLANATION: Returns orders with total greater than 100.
CONFIDENCE: HIGH
SQL:
SELECT id, total FROM orders WHERE total > 100`;
describe('Datalogue.query() — security integration', () => {
    it('executes a valid query end-to-end', async () => {
        const adapter = createMockAdapter();
        const qm = new Datalogue({
            db: adapter,
            ai: createMockAI(VALID_AI_RESPONSE),
            allowedTables: ['orders', 'customers'],
            auditLog: false, // suppress stdout noise
        });
        const result = await qm.query('show orders over 100');
        expect(result.sql).toBeDefined();
        expect(result.rows).toHaveLength(2);
        expect(result.confidence).toBe('high');
        expect(result.summary).toContain('orders');
        expect(adapter.query).toHaveBeenCalled();
    });
    it('blocks SQL injection in AI response (DROP TABLE)', async () => {
        const injectionResponse = `EXPLANATION: Dropping the orders table.
CONFIDENCE: HIGH
SQL:
DROP TABLE orders`;
        const qm = new Datalogue({
            db: createMockAdapter(),
            ai: createMockAI(injectionResponse),
            allowedTables: ['orders', 'customers'],
            auditLog: false,
        });
        await expect(qm.query('drop orders')).rejects.toThrow(DatalogueError);
        try {
            await qm.query('drop orders');
        }
        catch (err) {
            expect(err.code).toBe('SQL_INJECTION_BLOCKED');
        }
    });
    it('blocks access to tables not in allowlist', async () => {
        const response = `EXPLANATION: Getting secrets.
CONFIDENCE: HIGH
SQL:
SELECT * FROM secret_data`;
        const qm = new Datalogue({
            db: createMockAdapter(),
            ai: createMockAI(response),
            allowedTables: ['orders'],
            auditLog: false,
        });
        await expect(qm.query('show secrets')).rejects.toThrow(DatalogueError);
        try {
            await qm.query('show secrets');
        }
        catch (err) {
            expect(err.code).toBe('TABLE_NOT_ALLOWED');
        }
    });
    it('blocks mutations when allowMutations is false', async () => {
        const response = `EXPLANATION: Deleting order 1.
CONFIDENCE: HIGH
SQL:
DELETE FROM orders WHERE id = 1`;
        const qm = new Datalogue({
            db: createMockAdapter(),
            ai: createMockAI(response),
            allowedTables: ['orders'],
            auditLog: false,
        });
        await expect(qm.query('delete order 1')).rejects.toThrow(DatalogueError);
        try {
            await qm.query('delete order 1');
        }
        catch (err) {
            expect(err.code).toBe('MUTATION_NOT_ALLOWED');
        }
    });
    it('blocks system schema access in AI response', async () => {
        const response = `EXPLANATION: Listing system tables.
CONFIDENCE: HIGH
SQL:
SELECT * FROM pg_catalog.pg_tables`;
        const qm = new Datalogue({
            db: createMockAdapter(),
            ai: createMockAI(response),
            allowedTables: ['orders'],
            auditLog: false,
        });
        await expect(qm.query('list system tables')).rejects.toThrow(DatalogueError);
    });
    it('blocks dangerous function calls (pg_read_file)', async () => {
        const response = `EXPLANATION: Reading file.
CONFIDENCE: HIGH
SQL:
SELECT pg_read_file('/etc/passwd')`;
        const qm = new Datalogue({
            db: createMockAdapter(),
            ai: createMockAI(response),
            allowedTables: ['orders'],
            auditLog: false,
        });
        await expect(qm.query('read system file')).rejects.toThrow(DatalogueError);
    });
    it('returns dry-run result without executing', async () => {
        const adapter = createMockAdapter();
        const qm = new Datalogue({
            db: adapter,
            ai: createMockAI(VALID_AI_RESPONSE),
            allowedTables: ['orders', 'customers'],
            auditLog: false,
        });
        const result = await qm.query('show orders', { dryRun: true });
        expect(result.dryRun).toBe(true);
        expect(result.rows).toHaveLength(0);
        expect(result.sql).toBeDefined();
        // adapter.query should NOT have been called
        expect(adapter.query).not.toHaveBeenCalled();
    });
    it('retries on DB execution error', async () => {
        const adapter = createMockAdapter();
        adapter.query
            .mockRejectedValueOnce(new Error('column "revenue" does not exist'))
            .mockResolvedValueOnce([{ id: 1, total: 100 }]);
        const retryResponse = `EXPLANATION: Fixed query.
CONFIDENCE: MEDIUM
SQL:
SELECT id, total FROM orders`;
        const ai = createMockAI('');
        ai.complete
            .mockResolvedValueOnce(VALID_AI_RESPONSE)
            .mockResolvedValueOnce(retryResponse);
        const qm = new Datalogue({
            db: adapter,
            ai,
            allowedTables: ['orders', 'customers'],
            auditLog: false,
        });
        const result = await qm.query('show revenue');
        expect(result.rows).toHaveLength(1);
        expect(ai.complete).toHaveBeenCalledTimes(2);
        // The retry message should contain the sanitized error
        const retryCall = ai.complete.mock.calls[1];
        expect(retryCall[1]).toContain('column');
        expect(retryCall[1]).toContain('does not exist');
    });
    it('throws SQL_EXECUTION_ERROR after both attempts fail', async () => {
        const adapter = createMockAdapter();
        adapter.query
            .mockRejectedValueOnce(new Error('column "x" does not exist'))
            .mockRejectedValueOnce(new Error('column "y" does not exist'));
        const retryResponse = `EXPLANATION: Retry.
CONFIDENCE: LOW
SQL:
SELECT id FROM orders`;
        const ai = createMockAI('');
        ai.complete
            .mockResolvedValueOnce(VALID_AI_RESPONSE)
            .mockResolvedValueOnce(retryResponse);
        const qm = new Datalogue({
            db: adapter,
            ai,
            allowedTables: ['orders', 'customers'],
            auditLog: false,
        });
        try {
            await qm.query('show something');
            expect.unreachable('should have thrown');
        }
        catch (err) {
            expect(err).toBeInstanceOf(DatalogueError);
            expect(err.code).toBe('SQL_EXECUTION_ERROR');
        }
    });
    it('calls audit log function on successful query', async () => {
        const auditFn = vi.fn();
        const qm = new Datalogue({
            db: createMockAdapter(),
            ai: createMockAI(VALID_AI_RESPONSE),
            allowedTables: ['orders', 'customers'],
            auditLogFn: auditFn,
        });
        await qm.query('show orders', { userId: 'u1' });
        expect(auditFn).toHaveBeenCalledOnce();
        const entry = auditFn.mock.calls[0][0];
        expect(entry.blocked).toBe(false);
        expect(entry.userId).toBe('u1');
        expect(entry.rowCount).toBe(2);
    });
    it('calls audit log function on blocked query', async () => {
        const auditFn = vi.fn();
        const qm = new Datalogue({
            db: createMockAdapter(),
            ai: createMockAI(`EXPLANATION: Drop.\nCONFIDENCE: HIGH\nSQL:\nDROP TABLE orders`),
            allowedTables: ['orders'],
            auditLogFn: auditFn,
        });
        await qm.query('drop it').catch(() => { });
        expect(auditFn).toHaveBeenCalledOnce();
        const entry = auditFn.mock.calls[0][0];
        expect(entry.blocked).toBe(true);
        expect(entry.blockReason).toBeDefined();
    });
    it('calls beforeQuery and afterQuery hooks', async () => {
        const beforeFn = vi.fn();
        const afterFn = vi.fn().mockImplementation(async (result) => result);
        const qm = new Datalogue({
            db: createMockAdapter(),
            ai: createMockAI(VALID_AI_RESPONSE),
            allowedTables: ['orders', 'customers'],
            auditLog: false,
            hooks: {
                beforeQuery: beforeFn,
                afterQuery: afterFn,
            },
        });
        await qm.query('show orders', { userId: 'u1' });
        expect(beforeFn).toHaveBeenCalledWith('show orders', 'u1');
        expect(afterFn).toHaveBeenCalledOnce();
        expect(afterFn.mock.calls[0][1]).toBe('u1');
    });
    it('calls onBlock hook when query is blocked', async () => {
        const onBlockFn = vi.fn();
        const qm = new Datalogue({
            db: createMockAdapter(),
            ai: createMockAI(`EXPLANATION: Drop.\nCONFIDENCE: HIGH\nSQL:\nDROP TABLE orders`),
            allowedTables: ['orders'],
            auditLog: false,
            hooks: { onBlock: onBlockFn },
        });
        await qm.query('drop it', { userId: 'u1' }).catch(() => { });
        expect(onBlockFn).toHaveBeenCalledOnce();
        expect(onBlockFn.mock.calls[0][0]).toContain('destructive');
        expect(onBlockFn.mock.calls[0][2]).toBe('u1');
    });
    it('respects maxRowsReturned limit', async () => {
        const adapter = createMockAdapter();
        const rows = Array.from({ length: 50 }, (_, i) => ({ id: i }));
        adapter.query.mockResolvedValue(rows);
        const qm = new Datalogue({
            db: adapter,
            ai: createMockAI(VALID_AI_RESPONSE),
            allowedTables: ['orders', 'customers'],
            auditLog: false,
            maxRowsReturned: 10,
        });
        const result = await qm.query('all orders');
        expect(result.rows).toHaveLength(10);
        expect(result.rowCount).toBe(10);
    });
});
//# sourceMappingURL=query-security.test.js.map