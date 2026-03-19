import type {
  DBAdapter,
  SchemaInfo,
  TableInfo,
  ColumnInfo,
  DBDialect,
} from '../types.js';

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

const INTROSPECTION_QUERIES: Record<DBDialect, string> = {
  postgres: `
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      CASE WHEN kcu.column_name IS NOT NULL THEN 1 ELSE 0 END AS is_primary_key,
      CASE WHEN ccu_fk.column_name IS NOT NULL THEN 1 ELSE 0 END AS is_foreign_key,
      ccu_fk.table_name AS ref_table,
      ccu_fk.column_name AS ref_column
    FROM information_schema.columns c
    LEFT JOIN information_schema.table_constraints tc
      ON tc.table_name = c.table_name
      AND tc.table_schema = c.table_schema
      AND tc.constraint_type = 'PRIMARY KEY'
    LEFT JOIN information_schema.key_column_usage kcu
      ON kcu.table_name = c.table_name
      AND kcu.column_name = c.column_name
      AND kcu.table_schema = c.table_schema
      AND kcu.constraint_name = tc.constraint_name
    LEFT JOIN information_schema.table_constraints tc_fk
      ON tc_fk.table_name = c.table_name
      AND tc_fk.table_schema = c.table_schema
      AND tc_fk.constraint_type = 'FOREIGN KEY'
    LEFT JOIN information_schema.key_column_usage kcu_fk
      ON kcu_fk.table_name = c.table_name
      AND kcu_fk.column_name = c.column_name
      AND kcu_fk.table_schema = c.table_schema
      AND kcu_fk.constraint_name = tc_fk.constraint_name
    LEFT JOIN information_schema.constraint_column_usage ccu_fk
      ON ccu_fk.constraint_name = tc_fk.constraint_name
      AND ccu_fk.table_schema = c.table_schema
    WHERE c.table_schema = 'public'
    ORDER BY c.table_name, c.ordinal_position
  `,

  mysql: `
    SELECT
      c.TABLE_NAME AS table_name,
      c.COLUMN_NAME AS column_name,
      c.DATA_TYPE AS data_type,
      c.IS_NULLABLE AS is_nullable,
      CASE WHEN c.COLUMN_KEY = 'PRI' THEN 1 ELSE 0 END AS is_primary_key,
      CASE WHEN c.COLUMN_KEY = 'MUL' THEN 1 ELSE 0 END AS is_foreign_key,
      kcu.REFERENCED_TABLE_NAME AS ref_table,
      kcu.REFERENCED_COLUMN_NAME AS ref_column
    FROM information_schema.COLUMNS c
    LEFT JOIN information_schema.KEY_COLUMN_USAGE kcu
      ON kcu.TABLE_SCHEMA = c.TABLE_SCHEMA
      AND kcu.TABLE_NAME = c.TABLE_NAME
      AND kcu.COLUMN_NAME = c.COLUMN_NAME
      AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    WHERE c.TABLE_SCHEMA = DATABASE()
    ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
  `,

  mariadb: `
    SELECT
      c.TABLE_NAME AS table_name,
      c.COLUMN_NAME AS column_name,
      c.DATA_TYPE AS data_type,
      c.IS_NULLABLE AS is_nullable,
      CASE WHEN c.COLUMN_KEY = 'PRI' THEN 1 ELSE 0 END AS is_primary_key,
      CASE WHEN c.COLUMN_KEY = 'MUL' THEN 1 ELSE 0 END AS is_foreign_key,
      kcu.REFERENCED_TABLE_NAME AS ref_table,
      kcu.REFERENCED_COLUMN_NAME AS ref_column
    FROM information_schema.COLUMNS c
    LEFT JOIN information_schema.KEY_COLUMN_USAGE kcu
      ON kcu.TABLE_SCHEMA = c.TABLE_SCHEMA
      AND kcu.TABLE_NAME = c.TABLE_NAME
      AND kcu.COLUMN_NAME = c.COLUMN_NAME
      AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    WHERE c.TABLE_SCHEMA = DATABASE()
    ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
  `,

  mssql: `
    SELECT
      t.name AS table_name,
      col.name AS column_name,
      typ.name AS data_type,
      CASE WHEN col.is_nullable = 1 THEN 'YES' ELSE 'NO' END AS is_nullable,
      CASE WHEN ix.is_primary_key = 1 THEN 1 ELSE 0 END AS is_primary_key,
      CASE WHEN fkc.parent_column_id IS NOT NULL THEN 1 ELSE 0 END AS is_foreign_key,
      ref_t.name AS ref_table,
      ref_col.name AS ref_column
    FROM sys.tables t
    INNER JOIN sys.columns col ON col.object_id = t.object_id
    INNER JOIN sys.types typ ON typ.user_type_id = col.user_type_id
    LEFT JOIN sys.index_columns ic
      ON ic.object_id = col.object_id AND ic.column_id = col.column_id
    LEFT JOIN sys.indexes ix
      ON ix.object_id = ic.object_id AND ix.index_id = ic.index_id AND ix.is_primary_key = 1
    LEFT JOIN sys.foreign_key_columns fkc
      ON fkc.parent_object_id = col.object_id AND fkc.parent_column_id = col.column_id
    LEFT JOIN sys.tables ref_t ON ref_t.object_id = fkc.referenced_object_id
    LEFT JOIN sys.columns ref_col
      ON ref_col.object_id = fkc.referenced_object_id AND ref_col.column_id = fkc.referenced_column_id
    WHERE t.is_ms_shipped = 0
    ORDER BY t.name, col.column_id
  `,

  sqlite: `
    SELECT
      m.name AS table_name,
      p.name AS column_name,
      p.type AS data_type,
      CASE WHEN p."notnull" = 0 THEN 'YES' ELSE 'NO' END AS is_nullable,
      p.pk AS is_primary_key,
      0 AS is_foreign_key,
      NULL AS ref_table,
      NULL AS ref_column
    FROM sqlite_master m
    JOIN pragma_table_info(m.name) p
    WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%'
    ORDER BY m.name, p.cid
  `,
};

export async function introspectSchema(
  adapter: DBAdapter,
): Promise<SchemaInfo> {
  const sql = INTROSPECTION_QUERIES[adapter.dialect];
  const rows = (await adapter.query(sql)) as RawColumnRow[];
  return parseIntrospectionRows(rows, adapter.dialect);
}

export function parseIntrospectionRows(
  rows: RawColumnRow[],
  dialect: DBDialect,
): SchemaInfo {
  const tableMap = new Map<string, ColumnInfo[]>();

  for (const row of rows) {
    if (!tableMap.has(row.table_name)) {
      tableMap.set(row.table_name, []);
    }

    const col: ColumnInfo = {
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      isPrimaryKey: Number(row.is_primary_key) === 1,
      isForeignKey: Number(row.is_foreign_key) === 1,
    };

    if (row.ref_table && row.ref_column) {
      col.references = { table: row.ref_table, column: row.ref_column };
    }

    tableMap.get(row.table_name)!.push(col);
  }

  const tables: TableInfo[] = [];
  for (const [name, columns] of tableMap) {
    tables.push({ name, columns });
  }

  return { tables, dialect };
}
