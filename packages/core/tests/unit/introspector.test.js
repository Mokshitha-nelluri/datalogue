import { describe, it, expect } from 'vitest';
import { parseIntrospectionRows } from '../../src/schema/introspector.js';
describe('introspector', () => {
    it('parses empty rows into empty schema', () => {
        const result = parseIntrospectionRows([], 'postgres');
        expect(result).toEqual({ tables: [], dialect: 'postgres' });
    });
    it('groups columns by table name', () => {
        const rows = [
            {
                table_name: 'users',
                column_name: 'id',
                data_type: 'integer',
                is_nullable: 'NO',
                is_primary_key: 1,
                is_foreign_key: 0,
                ref_table: null,
                ref_column: null,
            },
            {
                table_name: 'users',
                column_name: 'name',
                data_type: 'varchar',
                is_nullable: 'YES',
                is_primary_key: 0,
                is_foreign_key: 0,
                ref_table: null,
                ref_column: null,
            },
            {
                table_name: 'orders',
                column_name: 'id',
                data_type: 'integer',
                is_nullable: 'NO',
                is_primary_key: 1,
                is_foreign_key: 0,
                ref_table: null,
                ref_column: null,
            },
        ];
        const result = parseIntrospectionRows(rows, 'postgres');
        expect(result.dialect).toBe('postgres');
        expect(result.tables).toHaveLength(2);
        expect(result.tables[0].name).toBe('users');
        expect(result.tables[0].columns).toHaveLength(2);
        expect(result.tables[1].name).toBe('orders');
        expect(result.tables[1].columns).toHaveLength(1);
    });
    it('maps nullable correctly', () => {
        const rows = [
            {
                table_name: 't',
                column_name: 'a',
                data_type: 'text',
                is_nullable: 'YES',
                is_primary_key: 0,
                is_foreign_key: 0,
                ref_table: null,
                ref_column: null,
            },
            {
                table_name: 't',
                column_name: 'b',
                data_type: 'text',
                is_nullable: 'NO',
                is_primary_key: 0,
                is_foreign_key: 0,
                ref_table: null,
                ref_column: null,
            },
        ];
        const result = parseIntrospectionRows(rows, 'mysql');
        expect(result.tables[0].columns[0].nullable).toBe(true);
        expect(result.tables[0].columns[1].nullable).toBe(false);
    });
    it('includes foreign key references when present', () => {
        const rows = [
            {
                table_name: 'orders',
                column_name: 'user_id',
                data_type: 'integer',
                is_nullable: 'NO',
                is_primary_key: 0,
                is_foreign_key: 1,
                ref_table: 'users',
                ref_column: 'id',
            },
        ];
        const result = parseIntrospectionRows(rows, 'postgres');
        const col = result.tables[0].columns[0];
        expect(col.isForeignKey).toBe(true);
        expect(col.references).toEqual({ table: 'users', column: 'id' });
    });
    it('omits references when ref_table is null', () => {
        const rows = [
            {
                table_name: 'items',
                column_name: 'id',
                data_type: 'integer',
                is_nullable: 'NO',
                is_primary_key: 1,
                is_foreign_key: 0,
                ref_table: null,
                ref_column: null,
            },
        ];
        const result = parseIntrospectionRows(rows, 'sqlite');
        expect(result.tables[0].columns[0].references).toBeUndefined();
    });
    it('deduplicates tables with same name', () => {
        const rows = [
            {
                table_name: 'products',
                column_name: 'id',
                data_type: 'integer',
                is_nullable: 'NO',
                is_primary_key: 1,
                is_foreign_key: 0,
                ref_table: null,
                ref_column: null,
            },
            {
                table_name: 'products',
                column_name: 'name',
                data_type: 'text',
                is_nullable: 'YES',
                is_primary_key: 0,
                is_foreign_key: 0,
                ref_table: null,
                ref_column: null,
            },
        ];
        const result = parseIntrospectionRows(rows, 'postgres');
        expect(result.tables).toHaveLength(1);
        expect(result.tables[0].columns).toHaveLength(2);
    });
});
//# sourceMappingURL=introspector.test.js.map