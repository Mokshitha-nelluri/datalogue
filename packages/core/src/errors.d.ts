export type DatalogueErrorCode = 'SQL_INJECTION_BLOCKED' | 'TABLE_NOT_ALLOWED' | 'MUTATION_NOT_ALLOWED' | 'RATE_LIMIT_EXCEEDED' | 'AI_PROVIDER_ERROR' | 'DB_CONNECTION_ERROR' | 'SQL_EXECUTION_ERROR' | 'SCHEMA_INTROSPECTION_FAILED' | 'INVALID_CONFIG';
export declare class DatalogueError extends Error {
    readonly code: DatalogueErrorCode;
    constructor(message: string, code: DatalogueErrorCode);
}
//# sourceMappingURL=errors.d.ts.map