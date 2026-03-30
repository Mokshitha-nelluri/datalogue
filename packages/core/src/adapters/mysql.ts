import type { DBAdapter, SchemaInfo } from '../types.js';
import { introspectSchema } from '../schema/introspector.js';

export class MySQLAdapter implements DBAdapter {
  public readonly dialect = 'mysql' as const;
  private pool: import('mysql2/promise').Pool | null = null;

  constructor(
    private readonly host: string,
    private readonly user: string,
    private readonly password: string,
    private readonly database: string,
    private readonly port: number = 3306,
    injectedPool?: import('mysql2/promise').Pool,
  ) {
    if (injectedPool) this.pool = injectedPool;
  }

  private getPool(): import('mysql2/promise').Pool {
    if (!this.pool) {
      // Dynamic require so mysql2 is only loaded when actually used
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mysql = require('mysql2/promise') as typeof import('mysql2/promise');
      this.pool = mysql.createPool({
        host: this.host,
        user: this.user,
        password: this.password,
        database: this.database,
        port: this.port,
        waitForConnections: true,
        connectionLimit: 10,
      });
    }
    return this.pool;
  }

  async query(sql: string, _params?: unknown[]): Promise<unknown[]> {
    const pool = this.getPool();
    const [rows] = await pool.query(sql);
    return rows as unknown[];
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
