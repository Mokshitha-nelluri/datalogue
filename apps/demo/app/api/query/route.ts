import { NextRequest, NextResponse } from 'next/server';
import { Datalogue } from 'datalogue';
import type { DatalogueConfig, DBAdapter, SchemaInfo, AIProvider, Message } from 'datalogue';
import Database from 'better-sqlite3';
import Anthropic from '@anthropic-ai/sdk';

/** Custom AI provider that uses the Anthropic SDK directly */
function createAnthropicProvider(apiKey: string): AIProvider {
  return {
    async complete(systemPrompt: string, userMessage: string, history: Message[]): Promise<string> {
      const client = new Anthropic({ apiKey });
      const messages = [
        ...history.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: userMessage },
      ];
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      });
      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('AI provider returned no text content');
      }
      return textBlock.text;
    },
  };
}

/** Lightweight DBAdapter that uses better-sqlite3 directly */
function createSQLiteAdapter(filepath: string): DBAdapter {
  const db = new Database(filepath, { readonly: true });

  return {
    dialect: 'sqlite' as const,
    async query(sql: string): Promise<unknown[]> {
      return db.prepare(sql).all();
    },
    async introspect(): Promise<SchemaInfo> {
      const rows = db.prepare(`
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
      `).all() as Array<{
        table_name: string;
        column_name: string;
        data_type: string;
        is_nullable: string;
        is_primary_key: number;
        is_foreign_key: number;
        ref_table: string | null;
        ref_column: string | null;
      }>;

      const tableMap = new Map<string, SchemaInfo['tables'][0]['columns']>();
      for (const row of rows) {
        if (!tableMap.has(row.table_name)) tableMap.set(row.table_name, []);
        tableMap.get(row.table_name)!.push({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          isPrimaryKey: row.is_primary_key === 1,
          isForeignKey: false,
        });
      }

      return {
        tables: [...tableMap.entries()].map(([name, columns]) => ({ name, columns })),
        dialect: 'sqlite',
      };
    },
    async close(): Promise<void> {
      db.close();
    },
  };
}

function getDatalogue(): Datalogue {
  const dbType = process.env.DEMO_DB_TYPE ?? 'sqlite';

  let db: DatalogueConfig['db'];
  if (dbType === 'postgres') {
    db = {
      type: 'postgres',
      connectionString: process.env.DEMO_DATABASE_URL ?? '',
    };
  } else {
    db = createSQLiteAdapter(process.env.DEMO_SQLITE_PATH ?? './northwind.db');
  }

  const aiType = process.env.DEMO_AI_TYPE ?? 'anthropic';
  let ai: DatalogueConfig['ai'];
  if (aiType === 'openai') {
    ai = { type: 'openai', apiKey: process.env.OPENAI_API_KEY ?? '' };
  } else {
    // Pass a pre-built AIProvider object to bypass dynamic import issues
    ai = createAnthropicProvider(process.env.ANTHROPIC_API_KEY ?? '');
  }

  return new Datalogue({
    db,
    ai,
    allowedTables: [
      'Customers',
      'Orders',
      'Order Details',
      'Products',
      'Categories',
      'Employees',
      'Suppliers',
      'Shippers',
      'Regions',
      'Territories',
    ],
    outputFormats: ['rows', 'summary', 'chartSpec', 'csv', 'sql'],
    maxRowsReturned: 500,
  });
}

export async function POST(request: NextRequest) {
  let body: { question?: string; dryRun?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const question = body.question;
  if (!question || typeof question !== 'string') {
    return NextResponse.json(
      { error: 'Missing "question" field' },
      { status: 400 },
    );
  }

  const qm = getDatalogue();

  try {
    const result = await qm.query(question, {
      dryRun: body.dryRun === true,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await qm.close();
  }
}
