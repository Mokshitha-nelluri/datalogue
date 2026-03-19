import { describe, it, expect } from 'vitest';
import { Datalogue, DatalogueError, } from '../../src/index.js';
describe('types', () => {
    it('Datalogue class is exported', () => {
        expect(Datalogue).toBeDefined();
    });
    it('DatalogueError is exported and constructable', () => {
        const err = new DatalogueError('test error', 'INVALID_CONFIG');
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(DatalogueError);
        expect(err.message).toBe('test error');
        expect(err.code).toBe('INVALID_CONFIG');
        expect(err.name).toBe('DatalogueError');
    });
    it('DatalogueError codes are correctly typed', () => {
        const codes = [
            'SQL_INJECTION_BLOCKED',
            'TABLE_NOT_ALLOWED',
            'MUTATION_NOT_ALLOWED',
            'RATE_LIMIT_EXCEEDED',
            'AI_PROVIDER_ERROR',
            'DB_CONNECTION_ERROR',
            'SQL_EXECUTION_ERROR',
            'SCHEMA_INTROSPECTION_FAILED',
            'INVALID_CONFIG',
        ];
        for (const code of codes) {
            const err = new DatalogueError(`error: ${code}`, code);
            expect(err.code).toBe(code);
        }
    });
});
//# sourceMappingURL=types.test.js.map