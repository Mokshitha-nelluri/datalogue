import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SchemaInfo } from '../../src/types.js';

// Mock introspector — static import so vi.mock works
const mockIntrospect = vi.fn<() => Promise<SchemaInfo>>();
vi.mock('../../src/schema/introspector.js', () => ({
  introspectSchema: (...args: unknown[]) => mockIntrospect(...(args as [])),
}));

import { SQLiteAdapter } from '../../src/adapters/sqlite.js';

/**
 * SQLiteAdapter accepts an optional db via constructor DI.
 * better-sqlite3 is synchronous: db.prepare(sql).all() returns rows directly.
 * Our mock replicates this exact call chain.
 */
function createMockDb() {
  const mockAll = vi.fn();
  const db = {
    prepare: vi.fn().mockReturnValue({ all: mockAll }),
    close: vi.fn(),
  } as unknown as import('better-sqlite3').Database & { _mockAll: ReturnType<typeof vi.fn> };
  (db as unknown as { _mockAll: ReturnType<typeof vi.fn> })._mockAll = mockAll;
  return db;
}

function getMockAll(db: import('better-sqlite3').Database): ReturnType<typeof vi.fn> {
  return (db as unknown as { _mockAll: ReturnType<typeof vi.fn> })._mockAll;
}

describe('SQLiteAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has dialect set to sqlite', () => {
    const adapter = new SQLiteAdapter('./test.db');
    expect(adapter.dialect).toBe('sqlite');
  });

  describe('query()', () => {
    it('returns rows from prepare().all() chain', async () => {
      const rows = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const db = createMockDb();
      getMockAll(db).mockReturnValueOnce(rows);

      const adapter = new SQLiteAdapter('./test.db', db);

      const result = await adapter.query('SELECT id, name FROM users');
      expect(result).toEqual(rows);
      expect(db.prepare).toHaveBeenCalledWith('SELECT id, name FROM users');
      expect(getMockAll(db)).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when query has no matching rows', async () => {
      const db = createMockDb();
      getMockAll(db).mockReturnValueOnce([]);

      const adapter = new SQLiteAdapter('./test.db', db);

      const result = await adapter.query('SELECT 1 WHERE 0');
      expect(result).toEqual([]);
    });

    it('uses synchronous prepare + all pattern (better-sqlite3 API)', async () => {
      const db = createMockDb();
      getMockAll(db).mockReturnValueOnce([{ x: 42 }]);

      const adapter = new SQLiteAdapter('./test.db', db);

      await adapter.query('SELECT 42 AS x');
      expect(db.prepare).toHaveBeenCalledWith('SELECT 42 AS x');
    });

    it('propagates database errors to the caller', async () => {
      const db = createMockDb();
      getMockAll(db).mockImplementationOnce(() => {
        throw new Error('no such table: users');
      });

      const adapter = new SQLiteAdapter('./test.db', db);

      await expect(adapter.query('SELECT * FROM users')).rejects.toThrow(
        'no such table: users',
      );
    });

    it('handles multiple sequential queries on the same connection', async () => {
      const db = createMockDb();
      getMockAll(db)
        .mockReturnValueOnce([{ count: 5 }])
        .mockReturnValueOnce([{ count: 10 }]);

      const adapter = new SQLiteAdapter('./test.db', db);

      const r1 = await adapter.query('SELECT COUNT(*) FROM orders');
      const r2 = await adapter.query('SELECT COUNT(*) FROM products');

      expect(r1).toEqual([{ count: 5 }]);
      expect(r2).toEqual([{ count: 10 }]);
      expect(db.prepare).toHaveBeenCalledTimes(2);
    });
  });

  describe('introspect()', () => {
    it('delegates to introspectSchema with the adapter', async () => {
      const schema: SchemaInfo = {
        tables: [
          {
            name: 'tasks',
            columns: [
              {
                name: 'id',
                type: 'INTEGER',
                nullable: false,
                isPrimaryKey: true,
                isForeignKey: false,
              },
              {
                name: 'title',
                type: 'TEXT',
                nullable: true,
                isPrimaryKey: false,
                isForeignKey: false,
              },
            ],
          },
        ],
        dialect: 'sqlite',
      };
      mockIntrospect.mockResolvedValueOnce(schema);

      const adapter = new SQLiteAdapter('./test.db');
      const result = await adapter.introspect();

      expect(result).toEqual(schema);
      expect(mockIntrospect).toHaveBeenCalledWith(adapter);
    });
  });

  describe('close()', () => {
    it('calls db.close() to release the file handle', async () => {
      const db = createMockDb();
      const adapter = new SQLiteAdapter('./test.db', db);

      await adapter.close();

      expect(db.close).toHaveBeenCalledTimes(1);
    });

    it('is safe to call when no database was ever opened', async () => {
      const adapter = new SQLiteAdapter('./test.db');
      await adapter.close(); // no db — should not throw
    });

    it('is idempotent — second close does not call db.close() again', async () => {
      const db = createMockDb();
      const adapter = new SQLiteAdapter('./test.db', db);

      await adapter.close();
      await adapter.close();

      expect(db.close).toHaveBeenCalledTimes(1);
    });
  });
});
