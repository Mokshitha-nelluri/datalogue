import type { DBAdapter, SchemaInfo } from '../types.js';
import { introspectSchema } from '../schema/introspector.js';

export class SQLiteAdapter implements DBAdapter {
  public readonly dialect = 'sqlite' as const;
  private db: import('better-sqlite3').Database | null = null;

  constructor(
    private readonly filepath: string,
    injectedDb?: import('better-sqlite3').Database,
  ) {
    if (injectedDb) this.db = injectedDb;
  }

  private getDB(): import('better-sqlite3').Database {
    if (!this.db) {
      // Dynamic require so better-sqlite3 is only loaded when actually used
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Database = require('better-sqlite3') as typeof import('better-sqlite3');
      this.db = new Database(this.filepath, { readonly: true });
    }
    return this.db;
  }

  async query(sql: string, _params?: unknown[]): Promise<unknown[]> {
    const db = this.getDB();
    const stmt = db.prepare(sql);
    return stmt.all() as unknown[];
  }

  async introspect(): Promise<SchemaInfo> {
    return introspectSchema(this);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
