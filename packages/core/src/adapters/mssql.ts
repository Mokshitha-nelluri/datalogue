import type { DBAdapter, SchemaInfo } from '../types.js';

export class MSSQLAdapter implements DBAdapter {
  public readonly dialect = 'mssql' as const;

  constructor(
    private readonly server: string,
    private readonly user: string,
    private readonly password: string,
    private readonly database: string,
    private readonly port: number = 1433,
    private readonly encrypt: boolean = true,
  ) {
    void this.server;
    void this.user;
    void this.password;
    void this.database;
    void this.port;
    void this.encrypt;
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
