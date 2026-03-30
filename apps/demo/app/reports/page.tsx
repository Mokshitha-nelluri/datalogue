'use client';

import { useState, useEffect } from 'react';
import { ResultView } from 'datalogue-react';
import type { QueryResult } from 'datalogue-react';

/**
 * Reports demo — tabular, printable-style report layout.
 * Shows how you'd use Datalogue for:
 *  - Scheduled report generation (cron-style)
 *  - Dry-run SQL previews before execution
 *  - Programmatic query pipelines (no user interaction)
 */

interface ReportSection {
  id: string;
  title: string;
  question: string;
  description: string;
}

const REPORT_SECTIONS: ReportSection[] = [
  {
    id: 'quarterly',
    title: '1. Quarterly Revenue Trend',
    question: 'Show me quarterly revenue trends',
    description: 'Revenue and order volume by fiscal quarter. Used for board-level reporting.',
  },
  {
    id: 'top-customers',
    title: '2. Key Account Summary',
    question: 'Who are the top 10 customers by total order value?',
    description: 'Top accounts ranked by lifetime order value. Cross-references customer, order, and order-detail tables.',
  },
  {
    id: 'late-orders',
    title: '3. Delivery Performance',
    question: 'Show employees with late orders',
    description: 'Orders shipped after required date, grouped by responsible employee. Flags operational issues.',
  },
  {
    id: 'reorder',
    title: '4. Inventory Action Items',
    question: 'Show products that need reordering',
    description: 'Active products below reorder level with supplier contact info. Requires immediate procurement action.',
  },
  {
    id: 'suppliers',
    title: '5. Supplier Distribution',
    question: 'Show suppliers by country',
    description: 'Geographic spread of supplier base. Important for supply-chain risk assessment.',
  },
  {
    id: 'discounts',
    title: '6. Discount Impact Analysis',
    question: 'Analyze discounts given across orders',
    description: 'Revenue and discount volume by discount band. Measures margin erosion from promotional pricing.',
  },
];

async function runQuery(question: string, dryRun = false): Promise<QueryResult> {
  const res = await fetch('/api/mock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, dryRun }),
  });
  return res.json();
}

export default function ReportsPage() {
  const [results, setResults] = useState<Record<string, QueryResult>>({});
  const [dryResults, setDryResults] = useState<Record<string, QueryResult>>({});
  const [loading, setLoading] = useState(true);
  const [showSQL, setShowSQL] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      setLoading(true);
      const data: Record<string, QueryResult> = {};
      const dry: Record<string, QueryResult> = {};
      for (const section of REPORT_SECTIONS) {
        if (cancelled) break;
        try {
          const [full, preview] = await Promise.all([
            runQuery(section.question),
            runQuery(section.question, true),
          ]);
          data[section.id] = full;
          dry[section.id] = preview;
        } catch {
          // Skip failed sections
        }
      }
      if (!cancelled) {
        setResults(data);
        setDryResults(dry);
        setLoading(false);
      }
    }
    loadAll();
    return () => { cancelled = true; };
  }, []);

  const generatedAt = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      minHeight: '100vh',
    }}>
      {/* Report Header */}
      <header style={{
        borderBottom: '3px solid #1e293b',
        paddingBottom: '20px',
        marginBottom: '32px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <div style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: '#fef3c7',
              color: '#92400e',
              marginBottom: '12px',
            }}>
              Headless Mode &middot; Scheduled Report
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a', margin: 0 }}>
              Northwind Operations Report
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
              Generated: {generatedAt} &middot; {REPORT_SECTIONS.length} sections &middot; No user interaction required
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <a href="/" style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#475569', textDecoration: 'none', fontSize: '13px' }}>Home</a>
            <a href="/mock" style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#475569', textDecoration: 'none', fontSize: '13px' }}>Chat Demo</a>
            <a href="/dashboard" style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#475569', textDecoration: 'none', fontSize: '13px' }}>Dashboard</a>
            <button
              type="button"
              onClick={() => setShowSQL(s => !s)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: showSQL ? '#1e293b' : '#ffffff',
                color: showSQL ? '#ffffff' : '#475569',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {showSQL ? 'Hide SQL' : 'Show SQL'}
            </button>
          </div>
        </div>
      </header>

      {/* Loading state */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          color: '#94a3b8',
          fontSize: '15px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⟳</div>
          Generating report... running {REPORT_SECTIONS.length} queries
        </div>
      )}

      {/* Report Sections */}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {REPORT_SECTIONS.map(section => {
            const result = results[section.id];
            const dryResult = dryResults[section.id];
            if (!result) return null;

            return (
              <section key={section.id} style={{
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '32px',
              }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' }}>
                  {section.title}
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                  {section.description}
                </p>

                {/* SQL Preview (dry-run) */}
                {showSQL && dryResult?.sql && (
                  <div style={{
                    marginBottom: '16px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#334155',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                    overflowX: 'auto',
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', fontFamily: 'system-ui' }}>
                      Generated SQL (Dry Run)
                    </div>
                    {dryResult.sql}
                  </div>
                )}

                {/* Summary */}
                {result.summary && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #dcfce7',
                    fontSize: '13px',
                    color: '#166534',
                    marginBottom: '16px',
                    lineHeight: 1.6,
                  }}>
                    <strong>Summary:</strong> {result.summary}
                  </div>
                )}

                {/* Metadata bar */}
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  fontSize: '11px',
                  color: '#94a3b8',
                  marginBottom: '12px',
                }}>
                  <span>{result.rowCount ?? result.rows?.length ?? 0} rows returned</span>
                  <span>{result.executionTimeMs}ms execution</span>
                  <span>Confidence: {result.confidence ?? 'high'}</span>
                </div>

                {/* Data table + chart */}
                <ResultView result={result} theme="light" showCSVDownload />
              </section>
            );
          })}
        </div>
      )}

      {/* Usage Code Example */}
      {!loading && (
        <div style={{
          marginTop: '40px',
          padding: '24px',
          borderRadius: '12px',
          backgroundColor: '#1e293b',
          color: '#e2e8f0',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            How This Works — Headless Code Example
          </h3>
          <pre style={{
            margin: 0,
            fontSize: '12px',
            lineHeight: 1.7,
            overflowX: 'auto',
            color: '#cbd5e1',
          }}>
{`import { Datalogue } from 'datalogue';

// No chat UI — just pure programmatic queries
const dl = new Datalogue({
  adapter: postgresAdapter,
  provider: anthropicProvider,
  schema: { allowedTables: ['customers', 'orders', 'products', ...] },
  security: { maxRowCount: 1000 },
});

// Scheduled queries (e.g., cron job, serverless function)
const queries = [
  'quarterly revenue trends',
  'products that need reordering',
  'employees with late delivery rates',
];

for (const question of queries) {
  // Preview SQL first (dry run)
  const preview = await dl.query(question, { dryRun: true });
  console.log('SQL:', preview.sql);

  // Execute and get results
  const result = await dl.query(question);
  console.log(result.summary);
  console.log(result.rows);
}

// Pipe results into reports, emails, Slack, dashboards...`}
          </pre>
        </div>
      )}

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        fontSize: '13px',
        color: '#94a3b8',
        marginTop: '32px',
        paddingTop: '16px',
        borderTop: '1px solid #e2e8f0',
      }}>
        Datalogue v0.1.0 &middot; Scheduled Report Demo &middot; Headless / No Chat Interface
      </footer>
    </div>
  );
}
