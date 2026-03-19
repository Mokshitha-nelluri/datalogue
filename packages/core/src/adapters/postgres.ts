import type { DBAdapter, SchemaInfo } from '../types.js';

export class PostgresAdapter implements DBAdapter {
  public readonly dialect = 'postgres' as const;

  constructor(private readonly connectionString: string, _ssl?: boolean) {
    // suppress unused — used in Day 4
    void this.connectionString;
  }

  async query(_sql: string, _params?: unknown[]): Promise<unknown[]> {
    // TODO: Day 4
    throw new Error('Not implemented');
  }

  async introspect(): Promise<SchemaInfo> {
    // TODO: Day 2
    throw new Error('Not implemented');
  }

  async close(): Promise<void> {
    // TODO: Day 4
    throw new Error('Not implemented');
  }
}
