import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SchemaInfo } from '../../src/types.js';

// Mock introspector — static import so vi.mock works
const mockIntrospect = vi.fn<() => Promise<SchemaInfo>>();
vi.mock('../../src/schema/introspector.js', () => ({
  introspectSchema: (...args: unknown[]) => mockIntrospect(...(args as [])),
}));

import { MSSQLAdapter } from '../../src/adapters/mssql.js';

/**
 * MSSQLAdapter accepts an optional pool via constructor DI.
 * The mssql driver uses pool.request().query(sql) — a chained call pattern.
 * Our mock replicates this exact chain shape.
 */
function createMockPool() {
  const mockQuery = vi.fn();
  const pool = {
    request: vi.fn().mockReturnValue({ query: mockQuery }),
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as import('mssql').ConnectionPool & { _mockQuery: ReturnType<typeof vi.fn> };
  // Expose the inner query mock for test assertions
  (pool as unknown as { _mockQuery: ReturnType<typeof vi.fn> })._mockQuery = mockQuery;
  return pool;
}

function getMockQuery(pool: import('mssql').ConnectionPool): ReturnType<typeof vi.fn> {
  return (pool as unknown as { _mockQuery: ReturnType<typeof vi.fn> })._mockQuery;
}

describe('MSSQLAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has dialect set to mssql', () => {
    const adapter = new MSSQLAdapter('localhost', 'sa', 'pass', 'testdb');
    expect(adapter.dialect).toBe('mssql');
  });

  describe('query()', () => {
    it('extracts .recordset from the mssql result', async () => {
      const recordset = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const pool = createMockPool();
      getMockQuery(pool).mockResolvedValueOnce({ recordset });

      const adapter = new MSSQLAdapter('localhost', 'sa', 'pass', 'testdb', 1433, true, pool);

      const result = await adapter.query('SELECT id, name FROM users');
      expect(result).toEqual(recordset);
      expect(getMockQuery(pool)).toHaveBeenCalledWith('SELECT id, name FROM users');
    });

    it('returns empty array when no recordset rows', async () => {
      const pool = createMockPool();
      getMockQuery(pool).mockResolvedValueOnce({ recordset: [] });

      const adapter = new MSSQLAdapter('localhost', 'sa', 'pass', 'testdb', 1433, true, pool);

      const result = await adapter.query('SELECT 1 WHERE 1=0');
      expect(result).toEqual([]);
    });

    it('uses the request().query() chain pattern', async () => {
      const pool = createMockPool();
      getMockQuery(pool).mockResolvedValueOnce({ recordset: [] });

      const adapter = new MSSQLAdapter('localhost', 'sa', 'pass', 'testdb', 1433, true, pool);

      await adapter.query('SELECT 1');
      expect((pool as unknown as { request: ReturnType<typeof vi.fn> }).request).toHaveBeenCalledTimes(1);
      expect(getMockQuery(pool)).toHaveBeenCalledTimes(1);
    });

    it('propagates database errors to the caller', async () => {
      const pool = createMockPool();
      getMockQuery(pool).mockRejectedValueOnce(new Error('login failed'));

      const adapter = new MSSQLAdapter('localhost', 'sa', 'pass', 'testdb', 1433, true, pool);

      await expect(adapter.query('SELECT 1')).rejects.toThrow('login failed');
    });

    it('handles multiple sequential queries on the same connection', async () => {
      const pool = createMockPool();
      getMockQuery(pool)
        .mockResolvedValueOnce({ recordset: [{ count: 5 }] })
        .mockResolvedValueOnce({ recordset: [{ count: 10 }] });

      const adapter = new MSSQLAdapter('localhost', 'sa', 'pass', 'testdb', 1433, true, pool);

      const r1 = await adapter.query('SELECT COUNT(*) FROM orders');
      const r2 = await adapter.query('SELECT COUNT(*) FROM products');

      expect(r1).toEqual([{ count: 5 }]);
      expect(r2).toEqual([{ count: 10 }]);
    });
  });

  describe('introspect()', () => {
    it('delegates to introspectSchema with the adapter instance', async () => {
      const schema: SchemaInfo = {
        tables: [
          {
            name: 'employees',
            columns: [
              {
                name: 'id',
                type: 'int',
                nullable: false,
                isPrimaryKey: true,
                isForeignKey: false,
              },
              {
                name: 'department',
                type: 'nvarchar',
                nullable: true,
                isPrimaryKey: false,
                isForeignKey: false,
              },
            ],
          },
        ],
        dialect: 'mssql',
      };
      mockIntrospect.mockResolvedValueOnce(schema);

      const adapter = new MSSQLAdapter('localhost', 'sa', 'pass', 'testdb');
      const result = await adapter.introspect();

      expect(result).toEqual(schema);
      expect(mockIntrospect).toHaveBeenCalledWith(adapter);
    });
  });

  describe('close()', () => {
    it('calls pool.close() to release connections', async () => {
      const pool = createMockPool();
      const adapter = new MSSQLAdapter('localhost', 'sa', 'pass', 'testdb', 1433, true, pool);

      await adapter.close();

      expect(pool.close).toHaveBeenCalledTimes(1);
    });

    it('is safe to call when no connection was ever opened', async () => {
      const adapter = new MSSQLAdapter('localhost', 'sa', 'pass', 'testdb');
      await adapter.close();
    });

    it('is idempotent — second close does not call close() again', async () => {
      const pool = createMockPool();
      const adapter = new MSSQLAdapter('localhost', 'sa', 'pass', 'testdb', 1433, true, pool);

      await adapter.close();
      await adapter.close();

      expect(pool.close).toHaveBeenCalledTimes(1);
    });
  });
});
