import { describe, it, expect, vi } from 'vitest';
import { Datalogue } from '../../src/Datalogue.js';
import { DatalogueError } from '../../src/errors.js';
function createMockAdapter(schema = {
    tables: [
        {
            name: 'orders',
            columns: [
                {
                    name: 'id',
                    type: 'integer',
                    nullable: false,
                    isPrimaryKey: true,
                    isForeignKey: false,
                },
                {
                    name: 'total',
                    type: 'numeric',
                    nullable: true,
                    isPrimaryKey: false,
                    isForeignKey: false,
                },
            ],
        },
    ],
    dialect: 'postgres',
}) {
    return {
        dialect: 'postgres',
        query: vi.fn().mockResolvedValue([]),
        introspect: vi.fn().mockResolvedValue(schema),
        close: vi.fn().mockResolvedValue(undefined),
    };
}
function createMockAI(response) {
    return {
        complete: vi.fn().mockResolvedValue(response),
    };
}
describe('Datalogue', () => {
    describe('constructor', () => {
        it('accepts a custom DBAdapter and AIProvider', () => {
            const qm = new Datalogue({
                db: createMockAdapter(),
                ai: createMockAI(''),
                allowedTables: ['orders'],
            });
            expect(qm).toBeInstanceOf(Datalogue);
        });
        it('accepts a postgres config object', () => {
            const qm = new Datalogue({
                db: { type: 'postgres', connectionString: 'postgresql://localhost/test' },
                ai: createMockAI(''),
                allowedTables: ['orders'],
            });
            expect(qm).toBeInstanceOf(Datalogue);
        });
        it('accepts a mysql config object', () => {
            const qm = new Datalogue({
                db: {
                    type: 'mysql',
                    host: 'localhost',
                    user: 'root',
                    password: 'pass',
                    database: 'test',
                },
                ai: createMockAI(''),
                allowedTables: ['orders'],
            });
            expect(qm).toBeInstanceOf(Datalogue);
        });
        it('accepts an anthropic config object', () => {
            const qm = new Datalogue({
                db: createMockAdapter(),
                ai: { type: 'anthropic', apiKey: 'sk-test' },
                allowedTables: ['orders'],
            });
            expect(qm).toBeInstanceOf(Datalogue);
        });
        it('accepts an openai config object', () => {
            const qm = new Datalogue({
                db: createMockAdapter(),
                ai: { type: 'openai', apiKey: 'sk-test' },
                allowedTables: ['orders'],
            });
            expect(qm).toBeInstanceOf(Datalogue);
        });
    });
    describe('buildSystemPrompt', () => {
        it('builds a prompt by introspecting the schema', async () => {
            const adapter = createMockAdapter();
            const qm = new Datalogue({
                db: adapter,
                ai: createMockAI(''),
                allowedTables: ['orders'],
            });
            const prompt = await qm.buildSystemPrompt();
            expect(prompt).toContain('DATABASE DIALECT: postgres');
            expect(prompt).toContain('"orders"');
            expect(prompt).toContain('id (integer, PK)');
            expect(adapter.introspect).toHaveBeenCalledOnce();
        });
        it('caches schema after first call', async () => {
            const adapter = createMockAdapter();
            const qm = new Datalogue({
                db: adapter,
                ai: createMockAI(''),
                allowedTables: ['orders'],
            });
            await qm.buildSystemPrompt();
            await qm.buildSystemPrompt();
            expect(adapter.introspect).toHaveBeenCalledOnce();
        });
        it('includes table descriptions when configured', async () => {
            const qm = new Datalogue({
                db: createMockAdapter(),
                ai: createMockAI(''),
                allowedTables: ['orders'],
                tableDescriptions: {
                    orders: {
                        description: 'Customer purchase orders',
                        columns: { total: 'Amount in USD' },
                    },
                },
            });
            const prompt = await qm.buildSystemPrompt();
            expect(prompt).toContain('BUSINESS CONTEXT:');
            expect(prompt).toContain('Customer purchase orders');
            expect(prompt).toContain('orders.total: Amount in USD');
        });
    });
    describe('refreshSchema', () => {
        it('clears cached schema and re-introspects', async () => {
            const adapter = createMockAdapter();
            const qm = new Datalogue({
                db: adapter,
                ai: createMockAI(''),
                allowedTables: ['orders'],
            });
            await qm.buildSystemPrompt();
            expect(adapter.introspect).toHaveBeenCalledOnce();
            await qm.refreshSchema();
            expect(adapter.introspect).toHaveBeenCalledTimes(2);
        });
        it('throws SCHEMA_INTROSPECTION_FAILED on introspect error', async () => {
            const adapter = createMockAdapter();
            adapter.introspect
                .mockResolvedValueOnce({
                tables: [],
                dialect: 'postgres',
            })
                .mockRejectedValueOnce(new Error('connection refused'));
            const qm = new Datalogue({
                db: adapter,
                ai: createMockAI(''),
                allowedTables: ['orders'],
            });
            // First call succeeds
            await qm.buildSystemPrompt();
            // Refresh triggers a new introspect that fails
            await expect(qm.refreshSchema()).rejects.toThrow(DatalogueError);
            try {
                await qm.refreshSchema();
            }
            catch (err) {
                expect(err.code).toBe('SCHEMA_INTROSPECTION_FAILED');
            }
        });
    });
    describe('suggestQueries', () => {
        it('returns an array of query suggestions', async () => {
            const suggestions = [
                'What are the top 10 orders by total?',
                'How many orders are there?',
                'What is the average order total?',
            ];
            const mockAI = createMockAI(JSON.stringify(suggestions));
            const qm = new Datalogue({
                db: createMockAdapter(),
                ai: mockAI,
                allowedTables: ['orders'],
            });
            const result = await qm.suggestQueries(3);
            expect(result).toEqual(suggestions);
        });
        it('calls AI with schema-based prompt', async () => {
            const mockAI = createMockAI('["Q1?", "Q2?"]');
            const qm = new Datalogue({
                db: createMockAdapter(),
                ai: mockAI,
                allowedTables: ['orders'],
            });
            await qm.suggestQueries(2);
            const call = mockAI.complete.mock
                .calls[0];
            expect(call[0]).toContain('exactly 2 example');
            expect(call[0]).toContain('"orders"');
        });
        it('limits result to requested count', async () => {
            const mockAI = createMockAI('["Q1?", "Q2?", "Q3?", "Q4?", "Q5?"]');
            const qm = new Datalogue({
                db: createMockAdapter(),
                ai: mockAI,
                allowedTables: ['orders'],
            });
            const result = await qm.suggestQueries(2);
            expect(result).toHaveLength(2);
        });
        it('throws when AI returns non-JSON', async () => {
            const mockAI = createMockAI('These are some queries you could try...');
            const qm = new Datalogue({
                db: createMockAdapter(),
                ai: mockAI,
                allowedTables: ['orders'],
            });
            await expect(qm.suggestQueries()).rejects.toThrow(DatalogueError);
        });
        it('throws when AI returns non-array JSON', async () => {
            const mockAI = createMockAI('{"suggestions": ["Q1?"]}');
            const qm = new Datalogue({
                db: createMockAdapter(),
                ai: mockAI,
                allowedTables: ['orders'],
            });
            await expect(qm.suggestQueries()).rejects.toThrow(DatalogueError);
        });
        it('filters out non-string elements from the array', async () => {
            const mockAI = createMockAI('["Q1?", 42, "Q2?", null, "Q3?"]');
            const qm = new Datalogue({
                db: createMockAdapter(),
                ai: mockAI,
                allowedTables: ['orders'],
            });
            const result = await qm.suggestQueries(5);
            expect(result).toEqual(['Q1?', 'Q2?', 'Q3?']);
        });
    });
    describe('close', () => {
        it('delegates to the adapter close method', async () => {
            const adapter = createMockAdapter();
            const qm = new Datalogue({
                db: adapter,
                ai: createMockAI(''),
                allowedTables: ['orders'],
            });
            await qm.close();
            expect(adapter.close).toHaveBeenCalledOnce();
        });
    });
});
//# sourceMappingURL=datalogue.test.js.map