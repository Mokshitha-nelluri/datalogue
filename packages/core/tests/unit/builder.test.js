import { describe, it, expect } from 'vitest';
import { buildPrompt, buildSuggestPrompt } from '../../src/prompt/builder.js';
const testSchema = {
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
                    name: 'user_id',
                    type: 'integer',
                    nullable: false,
                    isPrimaryKey: false,
                    isForeignKey: true,
                    references: { table: 'users', column: 'id' },
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
        {
            name: 'users',
            columns: [
                {
                    name: 'id',
                    type: 'integer',
                    nullable: false,
                    isPrimaryKey: true,
                    isForeignKey: false,
                },
                {
                    name: 'name',
                    type: 'varchar',
                    nullable: false,
                    isPrimaryKey: false,
                    isForeignKey: false,
                },
            ],
        },
        {
            name: 'secret_table',
            columns: [
                {
                    name: 'id',
                    type: 'integer',
                    nullable: false,
                    isPrimaryKey: true,
                    isForeignKey: false,
                },
            ],
        },
    ],
    dialect: 'postgres',
};
describe('buildPrompt', () => {
    it('includes the dialect', () => {
        const prompt = buildPrompt(testSchema, 'postgres', ['orders', 'users']);
        expect(prompt).toContain('DATABASE DIALECT: postgres');
    });
    it('only includes allowed tables in the schema', () => {
        const prompt = buildPrompt(testSchema, 'postgres', ['orders']);
        expect(prompt).toContain('"orders"');
        expect(prompt).not.toContain('"users"');
        expect(prompt).not.toContain('"secret_table"');
    });
    it('includes columns with types and constraints', () => {
        const prompt = buildPrompt(testSchema, 'postgres', ['orders']);
        expect(prompt).toContain('id (integer, PK)');
        expect(prompt).toContain('user_id (integer, FK → users.id)');
        expect(prompt).toContain('total (numeric, nullable)');
    });
    it('includes all 6 rules', () => {
        const prompt = buildPrompt(testSchema, 'postgres', ['orders']);
        expect(prompt).toContain('Only generate SELECT statements');
        expect(prompt).toContain('Never hallucinate table or column names');
        expect(prompt).toContain('LIMIT');
        expect(prompt).toContain('Never use SELECT *');
        expect(prompt).toContain('CANNOT_ANSWER');
        expect(prompt).toContain('filesystem');
    });
    it('includes CONFIDENCE in the output format', () => {
        const prompt = buildPrompt(testSchema, 'postgres', ['orders']);
        expect(prompt).toContain('CONFIDENCE:');
        expect(prompt).toContain('EXPLANATION:');
        expect(prompt).toContain('SQL:');
    });
    it('includes table descriptions when provided', () => {
        const prompt = buildPrompt(testSchema, 'postgres', ['orders'], {
            orders: {
                description: 'All customer purchase orders',
                columns: {
                    total: 'Total order amount in USD',
                },
            },
        });
        expect(prompt).toContain('BUSINESS CONTEXT:');
        expect(prompt).toContain('orders: All customer purchase orders');
        expect(prompt).toContain('orders.total: Total order amount in USD');
    });
    it('omits BUSINESS CONTEXT when no descriptions provided', () => {
        const prompt = buildPrompt(testSchema, 'postgres', ['orders']);
        expect(prompt).not.toContain('BUSINESS CONTEXT:');
    });
    it('omits BUSINESS CONTEXT when descriptions is empty object', () => {
        const prompt = buildPrompt(testSchema, 'postgres', ['orders'], {});
        expect(prompt).not.toContain('BUSINESS CONTEXT:');
    });
    it('is case-insensitive when filtering by allowed tables', () => {
        const prompt = buildPrompt(testSchema, 'postgres', ['ORDERS', 'Users']);
        expect(prompt).toContain('"orders"');
        expect(prompt).toContain('"users"');
    });
});
describe('buildSuggestPrompt', () => {
    it('includes the schema', () => {
        const prompt = buildSuggestPrompt(testSchema, ['orders', 'users'], 3);
        expect(prompt).toContain('"orders"');
        expect(prompt).toContain('"users"');
        expect(prompt).not.toContain('"secret_table"');
    });
    it('requests the correct count', () => {
        const prompt = buildSuggestPrompt(testSchema, ['orders'], 7);
        expect(prompt).toContain('exactly 7 example');
    });
    it('asks for JSON array format', () => {
        const prompt = buildSuggestPrompt(testSchema, ['orders'], 3);
        expect(prompt).toContain('JSON array');
    });
});
//# sourceMappingURL=builder.test.js.map