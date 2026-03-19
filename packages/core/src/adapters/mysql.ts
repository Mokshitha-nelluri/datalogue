import type { DBAdapter, SchemaInfo } from '../types.js';

export class MySQLAdapter implements DBAdapter {
  public readonly dialect = 'mysql' as const;

  constructor(
    private readonly host: string,
    private readonly user: string,
    private readonly password: string,
    private readonly database: string,
    private readonly port: number = 3306,
  ) {
    void this.host;
    void this.user;
    void this.password;
    void this.database;
    void this.port;
  }

  async query(_sql: string, _params?: unknown[]): Promise<unknown[]> {
    // TODO: Day 4
    throw new Error('Not implemented');
  }

  async introspect(): Promise<SchemaInfo> {
    // TODO: Day 4
    throw new Error('Not implemented');
  }

  async close(): Promise<void> {
    // TODO: Day 4
    throw new Error('Not implemented');
  }
}
