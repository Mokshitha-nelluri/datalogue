import type { DBAdapter, SchemaInfo, DBDialect } from '../types.js';
interface RawColumnRow {
    table_name: string;
    column_name: string;
    data_type: string;
    is_nullable: string;
    is_primary_key: number;
    is_foreign_key: number;
    ref_table: string | null;
    ref_column: string | null;
}
export declare function introspectSchema(adapter: DBAdapter): Promise<SchemaInfo>;
export declare function parseIntrospectionRows(rows: RawColumnRow[], dialect: DBDialect): SchemaInfo;
export {};
//# sourceMappingURL=introspector.d.ts.map