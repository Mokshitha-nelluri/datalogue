import type { SchemaInfo, TableDescription } from '../types.js';
export declare function buildPrompt(schema: SchemaInfo, dialect: string, allowedTables: string[], tableDescriptions?: Record<string, TableDescription>): string;
export declare function buildSuggestPrompt(schema: SchemaInfo, allowedTables: string[], count: number): string;
//# sourceMappingURL=builder.d.ts.map