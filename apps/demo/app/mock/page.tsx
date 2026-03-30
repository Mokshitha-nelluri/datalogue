'use client';

import { useState } from 'react';
import { QueryBox, ResultView } from 'datalogue-react';
import type { QueryResult } from 'datalogue-react';

const SUGGESTIONS = [
  'Who are the top 10 customers by total order value?',
  'Show me monthly revenue for 1997',
  'What are the quarterly revenue trends?',
  'Which product categories have the highest sales?',
  'List employees who have processed more than 50 orders',
  'What are the 10 most expensive products?',
  'Show suppliers by country',
  'Show me shipping analysis by carrier and freight',
  'Which countries have the most orders?',
  'Show inventory and stock status',
  'Show territory sales performance by region',
  'Analyze discounts given across orders',
  'Show customer demographics by country',
  'Show top product performance by revenue',
  'Show employees with late order rates',
  'Show products that need reordering',
  'What is the average order value trend?',
];

export default function MockDemoPage() {
  const [lastResult, setLastResult] = useState<QueryResult | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  const theme = darkMode ? 'dark' : 'light';

  return (
    <div
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '40px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        minHeight: '100vh',
        transition: 'background-color 0.3s, color 0.3s',
        backgroundColor: darkMode ? '#0f172a' : undefined,
        color: darkMode ? '#e2e8f0' : undefined,
      }}
    >
      {/* Header */}
      <header style={{ textAlign: 'center', paddingBottom: '8px' }}>
        <div
          style={{
            display: 'inline-block',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '4px 12px',
            borderRadius: '9999px',
            backgroundColor: darkMode ? '#1e3a5f' : '#ebf4ff',
            color: darkMode ? '#90cdf4' : '#2b6cb0',
            marginBottom: '16px',
          }}
        >
          Interactive Demo &middot; Mock Data
        </div>
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '10px',
          }}
        >
          Datalogue
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: darkMode ? '#94a3b8' : '#64748b',
            maxWidth: '520px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Ask questions about the Northwind database in plain English.
          <br />
          12 tables, 17 query patterns. Try a suggestion or type your own.
        </p>

        {/* Nav links */}
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
          <a href="/dashboard" style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${darkMode ? '#4a5568' : '#e2e8f0'}`, color: darkMode ? '#90cdf4' : '#475569', textDecoration: 'none' }}>Dashboard (Headless)</a>
          <a href="/reports" style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${darkMode ? '#4a5568' : '#e2e8f0'}`, color: darkMode ? '#90cdf4' : '#475569', textDecoration: 'none' }}>Reports (Headless)</a>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => setDarkMode((d) => !d)}
          style={{
            marginTop: '16px',
            padding: '6px 16px',
            borderRadius: '8px',
            border: `1px solid ${darkMode ? '#4a5568' : '#e2e8f0'}`,
            backgroundColor: darkMode ? '#2d3748' : '#f7fafc',
            color: darkMode ? '#e2e8f0' : '#334155',
            fontSize: '13px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {darkMode ? '☀ Light Mode' : '● Dark Mode'}
        </button>
      </header>

      {/* Chat area */}
      <div style={{ flex: 1, minHeight: '420px' }}>
        <QueryBox
          endpoint="/api/mock"
          placeholder="Ask about orders, customers, products, employees..."
          theme={theme}
          suggestions={SUGGESTIONS}
          showDryRunToggle
          showConfidence
          showInlineResults
          onResult={setLastResult}
          style={{ height: '600px' }}
        />
      </div>

      {/* Result detail view */}
      {lastResult && (
        <div>
          <h2
            style={{
              fontSize: '17px',
              fontWeight: 700,
              marginBottom: '14px',
              color: darkMode ? '#e2e8f0' : '#334155',
            }}
          >
            Latest Result
          </h2>
          <ResultView
            result={lastResult}
            theme={theme}
            showCSVDownload
          />
        </div>
      )}

      {/* Feature callouts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          borderTop: `1px solid ${darkMode ? '#2d3748' : '#e2e8f0'}`,
          paddingTop: '24px',
        }}
      >
        {[
          { label: 'Charts', desc: 'Bar, line & pie — built-in SVG, zero deps' },
          { label: 'Dry Run', desc: 'Preview SQL without executing queries' },
          { label: 'Confidence', desc: 'Badges show how certain the AI is' },
          { label: 'CSV Export', desc: 'Download results as CSV with one click' },
        ].map((f) => (
          <div
            key={f.label}
            style={{
              padding: '16px',
              borderRadius: '10px',
              border: `1px solid ${darkMode ? '#2d3748' : '#e2e8f0'}`,
              backgroundColor: darkMode ? '#1e293b' : '#ffffff',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '14px',
                marginBottom: '4px',
              }}
            >
              {f.label}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: darkMode ? '#94a3b8' : '#64748b',
                lineHeight: 1.5,
              }}
            >
              {f.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          fontSize: '13px',
          color: darkMode ? '#64748b' : '#94a3b8',
          paddingTop: '12px',
          borderTop: `1px solid ${darkMode ? '#2d3748' : '#e2e8f0'}`,
        }}
      >
        Datalogue v0.1.0 &middot; Mock Data &middot; No API key required
      </footer>
    </div>
  );
}
