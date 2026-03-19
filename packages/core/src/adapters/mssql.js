export class MSSQLAdapter {
    server;
    user;
    password;
    database;
    port;
    encrypt;
    dialect = 'mssql';
    constructor(server, user, password, database, port = 1433, encrypt = true) {
        this.server = server;
        this.user = user;
        this.password = password;
        this.database = database;
        this.port = port;
        this.encrypt = encrypt;
        void this.server;
        void this.user;
        void this.password;
        void this.database;
        void this.port;
        void this.encrypt;
    }
    async query(_sql, _params) {
        // TODO: Day 4
        throw new Error('Not implemented');
    }
    async introspect() {
        // TODO: Day 4
        throw new Error('Not implemented');
    }
    async close() {
        // TODO: Day 4
        throw new Error('Not implemented');
    }
}
//# sourceMappingURL=mssql.js.map