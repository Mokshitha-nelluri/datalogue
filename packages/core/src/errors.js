export class DatalogueError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.name = 'DatalogueError';
        this.code = code;
    }
}
//# sourceMappingURL=errors.js.map