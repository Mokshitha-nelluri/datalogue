import type { DBAdapter, SchemaInfo } from '../types.js';
export declare class MSSQLAdapter implements DBAdapter {
    private readonly server;
    private readonly user;
    private readonly password;
    private readonly database;
    private readonly port;
    private readonly encrypt;
    readonly dialect: "mssql";
    constructor(server: string, user: string, password: string, database: string, port?: number, encrypt?: boolean);
    query(_sql: string, _params?: unknown[]): Promise<unknown[]>;
    introspect(): Promise<SchemaInfo>;
    close(): Promise<void>;
}
//# sourceMappingURL=mssql.d.ts.map