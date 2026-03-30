'use client';

import { useState } from 'react';
import { QueryBox, ResultView } from 'datalogue-react';
import type { QueryResult } from 'datalogue-react';

const SUGGESTIONS = [
  'Who are the top 10 customers by total order value?',
  'Show me monthly revenue for 1997',
  'What are the quarterly revenue trends?',
  'Which product categories have the highest sales?',
  'Show suppliers by country',
  'Show inventory and stock status',
];

const DEMO_PAGES = [
  {
    href: '/mock',
    title: 'Chat Demo (Mock)',
    desc: 'Interactive chat interface with 17 query patterns over the Northwind DB. No API key required.',
    tag: 'Chat UI',
    tagColor: '#ebf4ff',
    tagText: '#2b6cb0',
  },
  {
    href: '/dashboard',
    title: 'Executive Dashboard',
    desc: 'Headless mode: 12 pre-built queries displayed as dashboard cards. No chat interface.',
    tag: 'Headless',
    tagColor: '#f0fdf4',
    tagText: '#15803d',
  },
  {
    href: '/reports',
    title: 'Scheduled Report',
    desc: 'Headless mode: Auto-generated operations report with dry-run SQL previews and summaries.',
    tag: 'Headless',
    tagColor: '#fef3c7',
    tagText: '#92400e',
  },
];

export default function HomePage() {
  const [lastResult, setLastResult] = useState<QueryResult | null>(null);

  return (
    <div
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '32px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <header style={{ textAlign: 'center', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '8px' }}>
          Datalogue Demo
        </h1>
        <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '540px', margin: '0 auto', lineHeight: 1.6 }}>
          Natural language to SQL, powered by Datalogue. Ask questions about the Northwind database
          (12 tables, 3,000+ rows) using plain English.
        </p>
      </header>

      {/* Demo Pages Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px',
        marginBottom: '8px',
      }}>
        {DEMO_PAGES.map(page => (
          <a
            key={page.href}
            href={page.href}
            style={{
              display: 'block',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#94a3b8';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <div style={{
              display: 'inline-block',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: '9999px',
              backgroundColor: page.tagColor,
              color: page.tagText,
              marginBottom: '10px',
            }}>
              {page.tag}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
              {page.title}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              {page.desc}
            </div>
          </a>
        ))}
      </div>

      {/* Live query (needs API key) */}
      <div style={{
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: '#334155' }}>
          Live Query (requires API key + database)
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0' }}>
          Set ANTHROPIC_API_KEY and DATABASE_URL to query a real database. Otherwise, try the mock demos above.
        </p>
        <div style={{ minHeight: '400px' }}>
          <QueryBox
            endpoint="/api/query"
            placeholder="Ask about orders, customers, products, employees..."
            suggestions={SUGGESTIONS}
            showDryRunToggle
            showConfidence
            onResult={setLastResult}
            style={{ height: '400px' }}
          />
        </div>
      </div>

      {lastResult && (
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#334155' }}>
            Latest Result
          </h2>
          <ResultView result={lastResult} showCSVDownload />
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          fontSize: '13px',
          color: '#94a3b8',
          paddingTop: '16px',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        Datalogue v0.1.0 &middot; Northwind Dataset &middot; TypeScript-native NL&rarr;SQL
      </footer>
    </div>
  );
}
