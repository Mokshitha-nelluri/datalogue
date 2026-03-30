import type { DBAdapter, SchemaInfo } from '../types.js';
import { introspectSchema } from '../schema/introspector.js';

export class MSSQLAdapter implements DBAdapter {
  public readonly dialect = 'mssql' as const;
  private pool: import('mssql').ConnectionPool | null = null;

  constructor(
    private readonly server: string,
    private readonly user: string,
    private readonly password: string,
    private readonly database: string,
    private readonly port: number = 1433,
    private readonly encrypt: boolean = true,
    injectedPool?: import('mssql').ConnectionPool,
  ) {
    if (injectedPool) this.pool = injectedPool;
  }

  private async getPool(): Promise<import('mssql').ConnectionPool> {
    if (!this.pool) {
      // Dynamic require so mssql is only loaded when actually used
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sql = require('mssql') as typeof import('mssql');
      this.pool = await new sql.ConnectionPool({
        server: this.server,
        user: this.user,
        password: this.password,
        database: this.database,
        port: this.port,
        options: {
          encrypt: this.encrypt,
          trustServerCertificate: true,
        },
      }).connect();
    }
    return this.pool;
  }

  async query(sql: string, _params?: unknown[]): Promise<unknown[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(sql);
    return result.recordset as unknown[];
  }

  async introspect(): Promise<SchemaInfo> {
    return introspectSchema(this);
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }
}
