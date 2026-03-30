import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SchemaInfo } from '../../src/types.js';

// Mock introspector — static import so vi.mock works
const mockIntrospect = vi.fn<() => Promise<SchemaInfo>>();
vi.mock('../../src/schema/introspector.js', () => ({
  introspectSchema: (...args: unknown[]) => mockIntrospect(...(args as [])),
}));

import { PostgresAdapter } from '../../src/adapters/postgres.js';

/**
 * PostgresAdapter accepts an optional pool via constructor DI.
 * This is the same mechanism the Datalogue class uses internally —
 * we just pass a mock pg.Pool instead of a real one.
 */
function createMockPool() {
  return {
    query: vi.fn(),
    end: vi.fn().mockResolvedValue(undefined),
  } as unknown as import('pg').Pool;
}

describe('PostgresAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has dialect set to postgres', () => {
    const adapter = new PostgresAdapter('postgresql://localhost/test');
    expect(adapter.dialect).toBe('postgres');
  });

  describe('query()', () => {
    it('extracts .rows from the pg result object', async () => {
      const rows = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const pool = createMockPool();
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows });

      const adapter = new PostgresAdapter('postgresql://localhost/test', undefined, pool);

      const result = await adapter.query('SELECT id, name FROM users');
      expect(result).toEqual(rows);
      expect(pool.query).toHaveBeenCalledWith('SELECT id, name FROM users');
    });

    it('returns empty array when query has no matching rows', async () => {
      const pool = createMockPool();
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });

      const adapter = new PostgresAdapter('postgresql://localhost/test', undefined, pool);

      const result = await adapter.query('SELECT 1 WHERE false');
      expect(result).toEqual([]);
    });

    it('propagates database errors to the caller', async () => {
      const pool = createMockPool();
      (pool.query as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('relation "users" does not exist'),
      );

      const adapter = new PostgresAdapter('postgresql://localhost/test', undefined, pool);

      await expect(adapter.query('SELECT * FROM users')).rejects.toThrow(
        'relation "users" does not exist',
      );
    });

    it('handles multiple sequential queries on the same connection', async () => {
      const pool = createMockPool();
      (pool.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [{ count: 5 }] })
        .mockResolvedValueOnce({ rows: [{ count: 10 }] });

      const adapter = new PostgresAdapter('postgresql://localhost/test', undefined, pool);

      const r1 = await adapter.query('SELECT COUNT(*) FROM orders');
      const r2 = await adapter.query('SELECT COUNT(*) FROM products');

      expect(r1).toEqual([{ count: 5 }]);
      expect(r2).toEqual([{ count: 10 }]);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('introspect()', () => {
    it('delegates to introspectSchema with the adapter instance', async () => {
      const schema: SchemaInfo = {
        tables: [
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
                name: 'email',
                type: 'varchar',
                nullable: false,
                isPrimaryKey: false,
                isForeignKey: false,
              },
            ],
          },
        ],
        dialect: 'postgres',
      };
      mockIntrospect.mockResolvedValueOnce(schema);

      const adapter = new PostgresAdapter('postgresql://localhost/test');
      const result = await adapter.introspect();

      expect(result).toEqual(schema);
      expect(mockIntrospect).toHaveBeenCalledWith(adapter);
    });
  });

  describe('close()', () => {
    it('calls pool.end() to release connections', async () => {
      const pool = createMockPool();
      const adapter = new PostgresAdapter('postgresql://localhost/test', undefined, pool);

      await adapter.close();

      expect(pool.end).toHaveBeenCalledTimes(1);
    });

    it('is safe to call when no connection was ever opened', async () => {
      const adapter = new PostgresAdapter('postgresql://localhost/test');
      await adapter.close(); // no pool — should not throw
    });

    it('is idempotent — second close does not call end() again', async () => {
      const pool = createMockPool();
      const adapter = new PostgresAdapter('postgresql://localhost/test', undefined, pool);

      await adapter.close();
      await adapter.close();

      expect(pool.end).toHaveBeenCalledTimes(1);
    });
  });
});
