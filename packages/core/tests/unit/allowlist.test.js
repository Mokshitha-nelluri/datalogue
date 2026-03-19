import { describe, it, expect } from 'vitest';
import { enforceAllowlist } from '../../src/security/allowlist.js';
import { DatalogueError } from '../../src/errors.js';
describe('enforceAllowlist', () => {
    it('passes when all tables are allowed', () => {
        expect(() => enforceAllowlist(['orders', 'customers'], ['orders', 'customers'])).not.toThrow();
    });
    it('is case-insensitive', () => {
        expect(() => enforceAllowlist(['ORDERS', 'Customers'], ['orders', 'customers'])).not.toThrow();
    });
    it('throws TABLE_NOT_ALLOWED for disallowed table', () => {
        expect(() => enforceAllowlist(['orders', 'secret_data'], ['orders'])).toThrow(DatalogueError);
        try {
            enforceAllowlist(['orders', 'secret_data'], ['orders']);
        }
        catch (err) {
            expect(err.code).toBe('TABLE_NOT_ALLOWED');
            expect(err.message).toContain('secret_data');
        }
    });
    it('strips schema prefix before checking', () => {
        expect(() => enforceAllowlist(['public.orders'], ['orders'])).not.toThrow();
    });
    it('throws for schema-qualified table not in list', () => {
        expect(() => enforceAllowlist(['pg_catalog.pg_tables'], ['orders'])).toThrow(DatalogueError);
    });
    it('passes for empty referencedTables', () => {
        expect(() => enforceAllowlist([], ['orders'])).not.toThrow();
    });
    it('throws when allowedTables is empty', () => {
        expect(() => enforceAllowlist(['orders'], [])).toThrow(DatalogueError);
    });
});
//# sourceMappingURL=allowlist.test.js.map