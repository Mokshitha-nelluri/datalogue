import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SchemaInfo } from '../../src/types.js';

// Mock introspector — static import so vi.mock works
const mockIntrospect = vi.fn<() => Promise<SchemaInfo>>();
vi.mock('../../src/schema/introspector.js', () => ({
  introspectSchema: (...args: unknown[]) => mockIntrospect(...(args as [])),
}));

import { MySQLAdapter } from '../../src/adapters/mysql.js';

/**
 * MySQLAdapter accepts an optional pool via constructor DI.
 * We pass a mock mysql2 pool that returns the [rows, fields] tuple
 * format — exactly what the real mysql2/promise driver returns.
 */
function createMockPool() {
  return {
    query: vi.fn(),
    end: vi.fn().mockResolvedValue(undefined),
  } as unknown as import('mysql2/promise').Pool;
}

describe('MySQLAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has dialect set to mysql', () => {
    const adapter = new MySQLAdapter('localhost', 'root', 'pass', 'testdb');
    expect(adapter.dialect).toBe('mysql');
  });

  describe('query()', () => {
    it('extracts the first element from mysql2 [rows, fields] tuple', async () => {
      const rows = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const pool = createMockPool();
      // mysql2/promise returns [rows, fields] tuple
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce([rows, []]);

      const adapter = new MySQLAdapter('localhost', 'root', 'pass', 'testdb', 3306, pool);

      const result = await adapter.query('SELECT id, name FROM users');
      expect(result).toEqual(rows);
      expect(pool.query).toHaveBeenCalledWith('SELECT id, name FROM users');
    });

    it('returns empty array when query has no matching rows', async () => {
      const pool = createMockPool();
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce([[], []]);

      const adapter = new MySQLAdapter('localhost', 'root', 'pass', 'testdb', 3306, pool);

      const result = await adapter.query('SELECT 1 WHERE false');
      expect(result).toEqual([]);
    });

    it('propagates database errors to the caller', async () => {
      const pool = createMockPool();
      (pool.query as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('access denied'),
      );

      const adapter = new MySQLAdapter('localhost', 'root', 'pass', 'testdb', 3306, pool);

      await expect(adapter.query('SELECT 1')).rejects.toThrow('access denied');
    });

    it('handles multiple sequential queries on the same connection', async () => {
      const pool = createMockPool();
      (pool.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([[{ count: 5 }], []])
        .mockResolvedValueOnce([[{ count: 10 }], []]);

      const adapter = new MySQLAdapter('localhost', 'root', 'pass', 'testdb', 3306, pool);

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
            name: 'products',
            columns: [
              {
                name: 'id',
                type: 'int',
                nullable: false,
                isPrimaryKey: true,
                isForeignKey: false,
              },
              {
                name: 'price',
                type: 'decimal',
                nullable: true,
                isPrimaryKey: false,
                isForeignKey: false,
              },
            ],
          },
        ],
        dialect: 'mysql',
      };
      mockIntrospect.mockResolvedValueOnce(schema);

      const adapter = new MySQLAdapter('localhost', 'root', 'pass', 'testdb');
      const result = await adapter.introspect();

      expect(result).toEqual(schema);
      expect(mockIntrospect).toHaveBeenCalledWith(adapter);
    });
  });

  describe('close()', () => {
    it('calls pool.end() to release connections', async () => {
      const pool = createMockPool();
      const adapter = new MySQLAdapter('localhost', 'root', 'pass', 'testdb', 3306, pool);

      await adapter.close();

      expect(pool.end).toHaveBeenCalledTimes(1);
    });

    it('is safe to call when no connection was ever opened', async () => {
      const adapter = new MySQLAdapter('localhost', 'root', 'pass', 'testdb');
      await adapter.close();
    });

    it('is idempotent — second close does not call end() again', async () => {
      const pool = createMockPool();
      const adapter = new MySQLAdapter('localhost', 'root', 'pass', 'testdb', 3306, pool);

      await adapter.close();
      await adapter.close();

      expect(pool.end).toHaveBeenCalledTimes(1);
    });
  });
});
