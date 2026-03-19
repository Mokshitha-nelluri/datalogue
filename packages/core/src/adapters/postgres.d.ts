import type { DBAdapter, SchemaInfo } from '../types.js';
export declare class PostgresAdapter implements DBAdapter {
    private readonly connectionString;
    readonly dialect: "postgres";
    constructor(connectionString: string, _ssl?: boolean);
    query(_sql: string, _params?: unknown[]): Promise<unknown[]>;
    introspect(): Promise<SchemaInfo>;
    close(): Promise<void>;
}
//# sourceMappingURL=postgres.d.ts.map