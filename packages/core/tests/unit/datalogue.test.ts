import { describe, it, expect, vi } from 'vitest';
import { Datalogue } from '../../src/Datalogue.js';
import { DatalogueError } from '../../src/errors.js';
import type {
  AIProvider,
  DBAdapter,
  SchemaInfo,
  Message,
} from '../../src/types.js';

function createMockAdapter(
  schema: SchemaInfo = {
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
  },
): DBAdapter {
  return {
    dialect: 'postgres',
    query: vi.fn().mockResolvedValue([]),
    introspect: vi.fn().mockResolvedValue(schema),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockAI(response: string): AIProvider {
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
      (adapter.introspect as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          tables: [],
          dialect: 'postgres' as const,
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
      } catch (err) {
        expect((err as DatalogueError).code).toBe(
          'SCHEMA_INTROSPECTION_FAILED',
        );
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
      const call = (mockAI.complete as ReturnType<typeof vi.fn>).mock
        .calls[0] as [string, string, Message[]];
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

  describe('rowFilter', () => {
    const AI_RESPONSE =
      'EXPLANATION: All orders\nCONFIDENCE: high\nSQL: SELECT id, total FROM orders';

    it('injects WHERE clause with userId when rowFilter is configured', async () => {
      const adapter = createMockAdapter();
      (adapter.query as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1, total: 100 }]);
      const qm = new Datalogue({
        db: adapter,
        ai: createMockAI(AI_RESPONSE),
        allowedTables: ['orders'],
        rowFilter: { column: 'user_id' },
      });

      await qm.query('show me all orders', { userId: 'user_123' });
      const executedSQL = (adapter.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(executedSQL).toContain("WHERE user_id = 'user_123'");
    });

    it('prepends filter with AND when SQL already has WHERE', async () => {
      const aiWithWhere = createMockAI(
        'EXPLANATION: Big orders\nCONFIDENCE: high\nSQL: SELECT id FROM orders WHERE total > 100',
      );
      const adapter = createMockAdapter();
      (adapter.query as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const qm = new Datalogue({
        db: adapter,
        ai: aiWithWhere,
        allowedTables: ['orders'],
        rowFilter: { column: 'tenant_id' },
      });

      await qm.query('big orders', { userId: 'acme' });
      const executedSQL = (adapter.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(executedSQL).toContain("tenant_id = 'acme' AND total > 100");
    });

    it('inserts WHERE before ORDER BY', async () => {
      const aiWithOrder = createMockAI(
        'EXPLANATION: Sorted\nCONFIDENCE: high\nSQL: SELECT id, total FROM orders ORDER BY total DESC',
      );
      const adapter = createMockAdapter();
      (adapter.query as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const qm = new Datalogue({
        db: adapter,
        ai: aiWithOrder,
        allowedTables: ['orders'],
        rowFilter: { column: 'user_id' },
      });

      await qm.query('sorted orders', { userId: 'u1' });
      const executedSQL = (adapter.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(executedSQL).toMatch(/WHERE user_id = 'u1' ORDER BY/);
    });

    it('throws INVALID_CONFIG when rowFilter is set but no userId provided', async () => {
      const qm = new Datalogue({
        db: createMockAdapter(),
        ai: createMockAI(AI_RESPONSE),
        allowedTables: ['orders'],
        rowFilter: { column: 'user_id' },
      });

      await expect(qm.query('show orders')).rejects.toThrow(DatalogueError);
      try {
        await qm.query('show orders');
      } catch (err) {
        expect((err as DatalogueError).code).toBe('INVALID_CONFIG');
      }
    });

    it('rejects userId with special characters to prevent injection', async () => {
      const qm = new Datalogue({
        db: createMockAdapter(),
        ai: createMockAI(AI_RESPONSE),
        allowedTables: ['orders'],
        rowFilter: { column: 'user_id' },
      });

      await expect(
        qm.query('orders', { userId: "admin'; DROP TABLE orders;--" }),
      ).rejects.toThrow('invalid characters');
    });

    it('includes filter in dry-run SQL output', async () => {
      const adapter = createMockAdapter();
      const qm = new Datalogue({
        db: adapter,
        ai: createMockAI(AI_RESPONSE),
        allowedTables: ['orders'],
        rowFilter: { column: 'org_id' },
      });

      const result = await qm.query('orders', { userId: 'org_42', dryRun: true });
      expect(result.sql).toContain("WHERE org_id = 'org_42'");
      expect(result.dryRun).toBe(true);
    });

    it('does not modify SQL when rowFilter is not configured', async () => {
      const adapter = createMockAdapter();
      (adapter.query as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const qm = new Datalogue({
        db: adapter,
        ai: createMockAI(AI_RESPONSE),
        allowedTables: ['orders'],
      });

      await qm.query('orders', { userId: 'user_1' });
      const executedSQL = (adapter.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(executedSQL).not.toContain('WHERE');
    });
  });

  describe('rateLimit', () => {
    it('throws RATE_LIMIT_EXCEEDED after exceeding requestsPerMinute', async () => {
      const AI_RESPONSE =
        'EXPLANATION: All orders\nCONFIDENCE: high\nSQL: SELECT id FROM orders';
      const adapter = createMockAdapter();
      (adapter.query as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const qm = new Datalogue({
        db: adapter,
        ai: createMockAI(AI_RESPONSE),
        allowedTables: ['orders'],
        rateLimit: { requestsPerMinute: 2 },
      });

      // First two should succeed
      await qm.query('q1', { userId: 'u1' });
      await qm.query('q2', { userId: 'u1' });

      // Third should fail
      await expect(qm.query('q3', { userId: 'u1' })).rejects.toThrow(
        DatalogueError,
      );
      try {
        await qm.query('q4', { userId: 'u1' });
      } catch (err) {
        expect((err as DatalogueError).code).toBe('RATE_LIMIT_EXCEEDED');
      }
    });

    it('rate limits are per-user', async () => {
      const AI_RESPONSE =
        'EXPLANATION: x\nCONFIDENCE: high\nSQL: SELECT id FROM orders';
      const adapter = createMockAdapter();
      (adapter.query as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const qm = new Datalogue({
        db: adapter,
        ai: createMockAI(AI_RESPONSE),
        allowedTables: ['orders'],
        rateLimit: { requestsPerMinute: 1 },
      });

      // user A uses their 1 request
      await qm.query('q1', { userId: 'userA' });

      // user B should still be allowed
      await qm.query('q1', { userId: 'userB' });

      // user A should be blocked
      await expect(qm.query('q2', { userId: 'userA' })).rejects.toThrow(
        'Rate limit exceeded',
      );
    });

    it('does not rate limit when rateLimit is not configured', async () => {
      const AI_RESPONSE =
        'EXPLANATION: x\nCONFIDENCE: high\nSQL: SELECT id FROM orders';
      const adapter = createMockAdapter();
      (adapter.query as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const qm = new Datalogue({
        db: adapter,
        ai: createMockAI(AI_RESPONSE),
        allowedTables: ['orders'],
      });

      // Should all succeed — no limit
      for (let i = 0; i < 10; i++) {
        await qm.query(`q${i}`);
      }
      expect(adapter.query).toHaveBeenCalledTimes(10);
    });
  });
});
