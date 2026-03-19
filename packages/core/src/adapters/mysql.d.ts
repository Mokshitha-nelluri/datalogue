import type { DBAdapter, SchemaInfo } from '../types.js';
export declare class MySQLAdapter implements DBAdapter {
    private readonly host;
    private readonly user;
    private readonly password;
    private readonly database;
    private readonly port;
    readonly dialect: "mysql";
    constructor(host: string, user: string, password: string, database: string, port?: number);
    query(_sql: string, _params?: unknown[]): Promise<unknown[]>;
    introspect(): Promise<SchemaInfo>;
    close(): Promise<void>;
}
//# sourceMappingURL=mysql.d.ts.map