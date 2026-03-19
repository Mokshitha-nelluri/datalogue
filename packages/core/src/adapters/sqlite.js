export class SQLiteAdapter {
    filepath;
    dialect = 'sqlite';
    constructor(filepath) {
        this.filepath = filepath;
        void this.filepath;
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
//# sourceMappingURL=sqlite.js.map