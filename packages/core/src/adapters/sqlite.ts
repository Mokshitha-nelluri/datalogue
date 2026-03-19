import type { DBAdapter, SchemaInfo } from '../types.js';

export class SQLiteAdapter implements DBAdapter {
  public readonly dialect = 'sqlite' as const;

  constructor(private readonly filepath: string) {
    void this.filepath;
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
