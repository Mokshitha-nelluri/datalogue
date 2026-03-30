'use client';

import { useState, useEffect, useCallback } from 'react';
import { ResultView } from 'datalogue-react';
import type { QueryResult } from 'datalogue-react';

/**
 * Dashboard demo — Headless usage of Datalogue.
 * No chat interface. Queries are pre-defined and run automatically on load.
 * Shows how you'd embed Datalogue in a BI dashboard or executive report.
 */

interface DashboardCard {
  id: string;
  title: string;
  question: string;
  size: 'full' | 'half';
}

const DASHBOARD_CARDS: DashboardCard[] = [
  { id: 'revenue', title: 'Monthly Revenue (1997)', question: 'Show me monthly revenue for 1997', size: 'full' },
  { id: 'customers', title: 'Top 10 Customers', question: 'Who are the top 10 customers by total order value?', size: 'half' },
  { id: 'categories', title: 'Sales by Category', question: 'Which product categories have the highest sales?', size: 'half' },
  { id: 'employees', title: 'Employee Performance', question: 'Show employee sales performance', size: 'half' },
  { id: 'shipping', title: 'Shipping Analysis', question: 'Show me shipping analysis by carrier', size: 'half' },
  { id: 'countries', title: 'Orders by Country', question: 'Show me orders by country', size: 'full' },
  { id: 'products', title: 'Top Product Performance', question: 'Show top product performance by revenue', size: 'half' },
  { id: 'inventory', title: 'Inventory Alerts', question: 'Show inventory and stock status', size: 'half' },
  { id: 'quarterly', title: 'Quarterly Revenue Trends', question: 'Show me quarterly revenue trends', size: 'half' },
  { id: 'discounts', title: 'Discount Analysis', question: 'Analyze discounts given across orders', size: 'half' },
  { id: 'territories', title: 'Territory Performance', question: 'Show territory sales performance by region', size: 'half' },
  { id: 'demographics', title: 'Customer Demographics', question: 'Show customer demographics by country', size: 'half' },
];

async function runQuery(question: string): Promise<QueryResult> {
  const res = await fetch('/api/mock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  return res.json();
}

function KPICard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div style={{
      padding: '20px 24px',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      backgroundColor: '#ffffff',
      minWidth: '180px',
    }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>
        {value}
      </div>
      {subtext && (
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{subtext}</div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [results, setResults] = useState<Record<string, QueryResult>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      setLoading(true);
      const entries: Record<string, QueryResult> = {};
      // Run queries sequentially to avoid hammering the API
      for (const card of DASHBOARD_CARDS) {
        if (cancelled) break;
        try {
          entries[card.id] = await runQuery(card.question);
        } catch {
          // Skip failed cards
        }
      }
      if (!cancelled) {
        setResults(entries);
        setLoading(false);
      }
    }
    loadAll();
    return () => { cancelled = true; };
  }, []);

  const refreshCard = useCallback(async (card: DashboardCard) => {
    setRefreshing(card.id);
    try {
      const result = await runQuery(card.question);
      setResults(prev => ({ ...prev, [card.id]: result }));
    } finally {
      setRefreshing(null);
    }
  }, []);

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '32px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      minHeight: '100vh',
    }}>
      {/* Header */}
      <header style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
              backgroundColor: '#f0fdf4',
              color: '#15803d',
              marginBottom: '12px',
            }}>
              Headless Mode &middot; No Chat UI
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a', margin: 0 }}>
              Northwind Executive Dashboard
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '6px' }}>
              Pre-defined queries run automatically. No chat interface — pure dashboard BI powered by Datalogue.
            </p>
          </div>
          <nav style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
            <a href="/" style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#475569', textDecoration: 'none' }}>Home</a>
            <a href="/mock" style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#475569', textDecoration: 'none' }}>Chat Demo</a>
            <a href="/reports" style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#475569', textDecoration: 'none' }}>Reports</a>
          </nav>
        </div>
      </header>

      {/* KPI row */}
      {!loading && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <KPICard label="Total Countries" value="15" subtext="Active shipping destinations" />
          <KPICard label="Total Revenue (1997)" value="$617K" subtext="Across 400 orders" />
          <KPICard label="Employees" value="9" subtext="3 countries" />
          <KPICard label="Products" value="77" subtext="8 categories" />
          <KPICard label="Suppliers" value="29" subtext="12 countries" />
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          color: '#94a3b8',
          fontSize: '15px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⟳</div>
          Loading dashboard... executing {DASHBOARD_CARDS.length} queries
        </div>
      )}

      {/* Cards grid */}
      {!loading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px',
        }}>
          {DASHBOARD_CARDS.map(card => {
            const result = results[card.id];
            if (!result) return null;
            return (
              <div
                key={card.id}
                style={{
                  gridColumn: card.size === 'full' ? '1 / -1' : undefined,
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  opacity: refreshing === card.id ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    {card.title}
                  </h2>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {result.rowCount ?? result.rows?.length ?? 0} rows &middot; {result.executionTimeMs}ms
                    </span>
                    <button
                      type="button"
                      onClick={() => refreshCard(card)}
                      disabled={refreshing !== null}
                      style={{
                        padding: '3px 10px',
                        fontSize: '11px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        color: '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      ↻ Refresh
                    </button>
                  </div>
                </div>
                <ResultView result={result} theme="light" showCSVDownload />
              </div>
            );
          })}
        </div>
      )}

      {/* Schema info */}
      {!loading && (
        <div style={{
          marginTop: '32px',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#334155', margin: '0 0 12px 0' }}>
            Database Schema (Northwind)
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '8px',
            fontSize: '13px',
          }}>
            {[
              'Customers (91 rows)',
              'Orders (830 rows)',
              'Order Details (2,155 rows)',
              'Products (77 rows)',
              'Categories (8 rows)',
              'Employees (9 rows)',
              'Suppliers (29 rows)',
              'Shippers (3 rows)',
              'Regions (4 rows)',
              'Territories (53 rows)',
              'EmployeeTerritories',
              'CustomerDemographics',
            ].map(table => (
              <div key={table} style={{
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#475569',
                fontFamily: 'monospace',
                fontSize: '12px',
              }}>
                {table}
              </div>
            ))}
          </div>
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
        Datalogue v0.1.0 &middot; Headless Dashboard Demo &middot; No chat interface &middot; {DASHBOARD_CARDS.length} pre-built queries
      </footer>
    </div>
  );
}
