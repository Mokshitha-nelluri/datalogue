import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { ResultView } from '../../src/ResultView.js';
import type { QueryResult, ChartSpec } from '../../src/ResultView.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BASE_RESULT: QueryResult = {
  sql: 'SELECT name, total FROM orders ORDER BY total DESC LIMIT 5',
  rows: [
    { name: 'Acme', total: 500 },
    { name: 'Globex', total: 300 },
    { name: 'Initech', total: 150 },
  ],
  summary: 'Top 3 companies by order total.',
  chartSpec: {
    type: 'bar',
    data: {
      labels: ['Acme', 'Globex', 'Initech'],
      datasets: [{ label: 'total', data: [500, 300, 150] }],
    },
  },
  csv: 'name,total\nAcme,500\nGlobex,300\nInitech,150',
  confidence: 'high',
  executionTimeMs: 55,
  rowCount: 3,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ─── Summary ─────────────────────────────────────────────────────────────────

describe('ResultView summary', () => {
  it('renders the summary text', () => {
    render(<ResultView result={BASE_RESULT} />);
    expect(screen.getByText('Top 3 companies by order total.')).toBeDefined();
  });

  it('hides summary when showSummary is false', () => {
    render(<ResultView result={BASE_RESULT} showSummary={false} />);
    expect(screen.queryByText('Top 3 companies by order total.')).toBeNull();
  });
});

// ─── Confidence badge ───────────────────────────────────────────────────────

describe('ResultView confidence', () => {
  it('renders the confidence badge', () => {
    render(<ResultView result={BASE_RESULT} />);
    expect(screen.getByText('high')).toBeDefined();
  });

  it('renders medium confidence', () => {
    render(<ResultView result={{ ...BASE_RESULT, confidence: 'medium' }} />);
    expect(screen.getByText('medium')).toBeDefined();
  });

  it('renders low confidence', () => {
    render(<ResultView result={{ ...BASE_RESULT, confidence: 'low' }} />);
    expect(screen.getByText('low')).toBeDefined();
  });
});

// ─── Metadata ───────────────────────────────────────────────────────────────

describe('ResultView metadata', () => {
  it('shows row count and execution time', () => {
    render(<ResultView result={BASE_RESULT} />);
    // The metadata text includes "3 rows · 55ms" with a middot entity
    const metaText = screen.getByText(/3 rows/);
    expect(metaText).toBeDefined();
    expect(metaText.textContent).toContain('55ms');
  });

  it('shows dry run indicator', () => {
    render(<ResultView result={{ ...BASE_RESULT, dryRun: true }} />);
    expect(screen.getByText(/dry run/)).toBeDefined();
  });
});

// ─── Tabs ───────────────────────────────────────────────────────────────────

describe('ResultView tabs', () => {
  it('renders Chart, Table, and SQL tabs', () => {
    render(<ResultView result={BASE_RESULT} />);
    expect(screen.getByText('Chart')).toBeDefined();
    expect(screen.getByText('Table (3)')).toBeDefined();
    expect(screen.getByText('SQL')).toBeDefined();
  });

  it('defaults to Chart tab when chartSpec is present', () => {
    render(<ResultView result={BASE_RESULT} />);
    // Chart tab button should have accent styling (active)
    const chartTab = screen.getByText('Chart');
    expect(chartTab).toBeDefined();
    // The dataset label from the bar chart should be visible
    expect(screen.getByText('total')).toBeDefined();
  });

  it('clicking Table tab shows the data table', () => {
    render(<ResultView result={BASE_RESULT} />);
    fireEvent.click(screen.getByText('Table (3)'));
    // Table headers
    expect(screen.getByText('name')).toBeDefined();
    // Table cell values — use getAllByText since 'total' appears as both header and chart label
    const acmeCells = screen.getAllByText('Acme');
    expect(acmeCells.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('500')).toBeDefined();
  });

  it('clicking SQL tab shows the query', () => {
    render(<ResultView result={BASE_RESULT} />);
    fireEvent.click(screen.getByText('SQL'));
    expect(
      screen.getByText('SELECT name, total FROM orders ORDER BY total DESC LIMIT 5'),
    ).toBeDefined();
  });

  it('hides Chart tab when showChart is false', () => {
    render(<ResultView result={BASE_RESULT} showChart={false} />);
    expect(screen.queryByText('Chart')).toBeNull();
  });

  it('hides Table tab when showTable is false', () => {
    render(<ResultView result={BASE_RESULT} showTable={false} />);
    expect(screen.queryByText('Table (3)')).toBeNull();
  });

  it('hides SQL tab when showSQL is false', () => {
    render(<ResultView result={BASE_RESULT} showSQL={false} />);
    expect(screen.queryByText('SQL')).toBeNull();
  });
});

// ─── Chart types ────────────────────────────────────────────────────────────

describe('ResultView chart types', () => {
  it('renders bar chart labels', () => {
    render(<ResultView result={BASE_RESULT} />);
    // Bar chart shows label names
    expect(screen.getByText('Acme')).toBeDefined();
    expect(screen.getByText('Globex')).toBeDefined();
    expect(screen.getByText('Initech')).toBeDefined();
  });

  it('renders line chart with SVG', () => {
    const lineResult: QueryResult = {
      ...BASE_RESULT,
      chartSpec: {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar'],
          datasets: [{ label: 'revenue', data: [100, 200, 150] }],
        },
      },
    };
    const { container } = render(<ResultView result={lineResult} />);
    // Line chart renders an SVG
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    expect(svg).not.toBeNull();
    // Should have path element for the line
    const path = svg!.querySelector('path');
    expect(path).not.toBeNull();
  });

  it('renders pie chart with SVG', () => {
    const pieResult: QueryResult = {
      ...BASE_RESULT,
      chartSpec: {
        type: 'pie',
        data: {
          labels: ['Category A', 'Category B'],
          datasets: [{ label: 'share', data: [60, 40] }],
        },
      },
    };
    const { container } = render(<ResultView result={pieResult} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    // Pie chart shows percentage labels (appears in both <title> and legend <span>)
    expect(screen.getAllByText(/Category A/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Category B/).length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Table rendering ────────────────────────────────────────────────────────

describe('ResultView table', () => {
  it('renders all rows by default', () => {
    render(<ResultView result={BASE_RESULT} showChart={false} />);
    // Without chart, table tab is first
    expect(screen.getByText('Acme')).toBeDefined();
    expect(screen.getByText('Globex')).toBeDefined();
    expect(screen.getByText('Initech')).toBeDefined();
  });

  it('respects maxTableRows', () => {
    const manyRows: QueryResult = {
      ...BASE_RESULT,
      rows: Array.from({ length: 20 }, (_, i) => ({ id: i, name: `Row ${i}` })),
      rowCount: 20,
      chartSpec: undefined,
    };
    render(<ResultView result={manyRows} maxTableRows={5} />);
    expect(screen.getByText('Showing 5 of 20 rows')).toBeDefined();
  });

  it('does not show table tab when rows is empty', () => {
    const emptyResult: QueryResult = {
      ...BASE_RESULT,
      rows: [],
      rowCount: 0,
      chartSpec: undefined,
    };
    render(<ResultView result={emptyResult} />);
    expect(screen.queryByText(/Table/)).toBeNull();
  });
});

// ─── CSV download ───────────────────────────────────────────────────────────

describe('ResultView CSV download', () => {
  it('shows Download CSV button when csv is present', () => {
    render(<ResultView result={BASE_RESULT} />);
    expect(screen.getByText('Download CSV')).toBeDefined();
  });

  it('hides Download CSV when showCSVDownload is false', () => {
    render(<ResultView result={BASE_RESULT} showCSVDownload={false} />);
    expect(screen.queryByText('Download CSV')).toBeNull();
  });

  it('hides Download CSV when csv is not in result', () => {
    const noCsv = { ...BASE_RESULT, csv: undefined };
    render(<ResultView result={noCsv} />);
    expect(screen.queryByText('Download CSV')).toBeNull();
  });

  it('clicking Download CSV triggers download', () => {
    // Stash originals (may be undefined in jsdom)
    const origCreate = globalThis.URL.createObjectURL;
    const origRevoke = globalThis.URL.revokeObjectURL;

    const mockCreate = vi.fn().mockReturnValue('blob:test');
    const mockRevoke = vi.fn();
    globalThis.URL.createObjectURL = mockCreate;
    globalThis.URL.revokeObjectURL = mockRevoke;

    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === 'a') {
        // Override click to avoid jsdom navigation issues
        el.click = clickSpy;
      }
      return el;
    });

    render(<ResultView result={BASE_RESULT} />);
    fireEvent.click(screen.getByText('Download CSV'));

    expect(mockCreate).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(mockRevoke).toHaveBeenCalled();

    // Restore
    globalThis.URL.createObjectURL = origCreate;
    globalThis.URL.revokeObjectURL = origRevoke;
    vi.mocked(document.createElement).mockRestore();
  });
});

// ─── Custom renderers ───────────────────────────────────────────────────────

describe('ResultView custom renderers', () => {
  it('uses renderChart when provided', () => {
    render(
      <ResultView
        result={BASE_RESULT}
        renderChart={(spec) => (
          <div data-testid="custom-chart">Custom chart: {spec.type}</div>
        )}
      />,
    );
    expect(screen.getByTestId('custom-chart')).toBeDefined();
    expect(screen.getByText('Custom chart: bar')).toBeDefined();
  });

  it('uses renderTable when provided', () => {
    render(
      <ResultView
        result={BASE_RESULT}
        showChart={false}
        renderTable={(rows, columns) => (
          <div data-testid="custom-table">
            {rows.length} rows, {columns.length} cols
          </div>
        )}
      />,
    );
    // Navigate to table tab since chart is hidden
    expect(screen.getByTestId('custom-table')).toBeDefined();
    expect(screen.getByText('3 rows, 2 cols')).toBeDefined();
  });

  it('uses renderSQL when provided', () => {
    render(
      <ResultView
        result={BASE_RESULT}
        renderSQL={(sql) => (
          <code data-testid="custom-sql">{sql}</code>
        )}
      />,
    );
    fireEvent.click(screen.getByText('SQL'));
    expect(screen.getByTestId('custom-sql')).toBeDefined();
  });
});

// ─── Theme ──────────────────────────────────────────────────────────────────

describe('ResultView theme', () => {
  it('applies dark theme styles', () => {
    const { container } = render(<ResultView result={BASE_RESULT} theme="dark" />);
    const root = container.firstElementChild as HTMLElement;
    // Dark theme background
    expect(root.style.backgroundColor).toBe('rgb(26, 32, 44)');  // #1a202c
  });

  it('applies light theme by default', () => {
    const { container } = render(<ResultView result={BASE_RESULT} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.backgroundColor).toBe('rgb(255, 255, 255)');  // #ffffff
  });
});

// ─── className and style overrides ──────────────────────────────────────────

describe('ResultView style overrides', () => {
  it('applies custom className', () => {
    const { container } = render(
      <ResultView result={BASE_RESULT} className="my-result" />,
    );
    expect(container.firstElementChild?.className).toBe('my-result');
  });

  it('merges custom style', () => {
    const { container } = render(
      <ResultView result={BASE_RESULT} style={{ maxWidth: '600px' }} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.maxWidth).toBe('600px');
  });
});
