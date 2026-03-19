export class PostgresAdapter {
    connectionString;
    dialect = 'postgres';
    constructor(connectionString, _ssl) {
        this.connectionString = connectionString;
        // suppress unused — used in Day 4
        void this.connectionString;
    }
    async query(_sql, _params) {
        // TODO: Day 4
        throw new Error('Not implemented');
    }
    async introspect() {
        // TODO: Day 2
        throw new Error('Not implemented');
    }
    async close() {
        // TODO: Day 4
        throw new Error('Not implemented');
    }
}
//# sourceMappingURL=postgres.js.map