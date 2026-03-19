export class MySQLAdapter {
    host;
    user;
    password;
    database;
    port;
    dialect = 'mysql';
    constructor(host, user, password, database, port = 3306) {
        this.host = host;
        this.user = user;
        this.password = password;
        this.database = database;
        this.port = port;
        void this.host;
        void this.user;
        void this.password;
        void this.database;
        void this.port;
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
//# sourceMappingURL=mysql.js.map