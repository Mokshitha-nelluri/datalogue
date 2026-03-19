import type { DBAdapter, SchemaInfo } from '../types.js';
export declare class SQLiteAdapter implements DBAdapter {
    private readonly filepath;
    readonly dialect: "sqlite";
    constructor(filepath: string);
    query(_sql: string, _params?: unknown[]): Promise<unknown[]>;
    introspect(): Promise<SchemaInfo>;
    close(): Promise<void>;
}
//# sourceMappingURL=sqlite.d.ts.map