import type { DBAdapter, SchemaInfo } from '../types.js';
import { introspectSchema } from '../schema/introspector.js';

export class PostgresAdapter implements DBAdapter {
  public readonly dialect = 'postgres' as const;
  private pool: import('pg').Pool | null = null;

  constructor(
    private readonly connectionString: string,
    private readonly ssl?: boolean,
    injectedPool?: import('pg').Pool,
  ) {
    if (injectedPool) this.pool = injectedPool;
  }

  private getPool(): import('pg').Pool {
    if (!this.pool) {
      // Dynamic require so pg is only loaded when actually used
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Pool } = require('pg') as typeof import('pg');
      this.pool = new Pool({
        connectionString: this.connectionString,
        ssl: this.ssl ? { rejectUnauthorized: false } : undefined,
      });
    }
    return this.pool;
  }

  async query(sql: string, _params?: unknown[]): Promise<unknown[]> {
    const pool = this.getPool();
    const result = await pool.query(sql);
    return result.rows as unknown[];
  }

  async introspect(): Promise<SchemaInfo> {
    return introspectSchema(this);
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
