import { describe, it, expect } from 'vitest';
import { QueryBox, ResultView } from '../../src/index.js';
import type {
  QueryBoxProps,
  ResultViewProps,
  ChatMessage,
  InputRenderProps,
  QueryResult,
  ChartSpec,
} from '../../src/index.js';

// ─── Export verification ─────────────────────────────────────────────────────

describe('datalogue-react exports', () => {
  it('exports QueryBox as a function', () => {
    expect(typeof QueryBox).toBe('function');
  });

  it('exports ResultView as a function', () => {
    expect(typeof ResultView).toBe('function');
  });
});

// ─── Type-level contract tests (compile-time) ───────────────────────────────

describe('QueryBoxProps type contract', () => {
  it('accepts required and optional props', () => {
    // Type assertion only — validates the type interface at compile time
    const props: QueryBoxProps = {
      endpoint: '/api/query',
    };
    expect(props.endpoint).toBe('/api/query');
  });

  it('accepts all optional props', () => {
    const props: QueryBoxProps = {
      endpoint: '/api/query',
      placeholder: 'Ask...',
      theme: 'dark',
      suggestions: ['What is revenue?'],
      showDryRunToggle: true,
      showConfidence: true,
      headers: { Authorization: 'Bearer token' },
      className: 'custom-class',
    };
    expect(props.theme).toBe('dark');
    expect(props.suggestions).toEqual(['What is revenue?']);
    expect(props.showDryRunToggle).toBe(true);
  });

  it('enforces theme union type', () => {
    const light: QueryBoxProps['theme'] = 'light';
    const dark: QueryBoxProps['theme'] = 'dark';
    expect(light).toBe('light');
    expect(dark).toBe('dark');
  });
});

describe('ResultViewProps type contract', () => {
  it('accepts a valid QueryResult', () => {
    const result: QueryResult = {
      sql: 'SELECT 1',
      rows: [],
      confidence: 'high',
      executionTimeMs: 50,
      rowCount: 0,
    };
    const props: ResultViewProps = { result };
    expect(props.result.sql).toBe('SELECT 1');
    expect(props.result.confidence).toBe('high');
  });

  it('accepts full QueryResult with all optionals', () => {
    const chartSpec: ChartSpec = {
      type: 'bar',
      data: {
        labels: ['A', 'B'],
        datasets: [{ label: 'count', data: [10, 20] }],
      },
    };
    const result: QueryResult = {
      sql: 'SELECT name, count FROM orders',
      rows: [{ name: 'A', count: 10 }, { name: 'B', count: 20 }],
      summary: 'Two orders found',
      chartSpec,
      csv: 'name,count\nA,10\nB,20',
      confidence: 'medium',
      executionTimeMs: 123,
      rowCount: 2,
      dryRun: false,
    };
    const props: ResultViewProps = {
      result,
      theme: 'dark',
      showSummary: true,
      showChart: true,
      showTable: true,
      showSQL: false,
      showCSVDownload: true,
      maxTableRows: 50,
    };
    expect(props.result.chartSpec?.type).toBe('bar');
    expect(props.maxTableRows).toBe(50);
  });
});

describe('ChatMessage type contract', () => {
  it('represents a user message', () => {
    const msg: ChatMessage = { role: 'user', content: 'What is revenue?' };
    expect(msg.role).toBe('user');
  });

  it('represents an assistant message with result', () => {
    const msg: ChatMessage = {
      role: 'assistant',
      content: 'Revenue is $1M',
      result: {
        sql: 'SELECT sum(amount) FROM orders',
        rows: [{ total: 1000000 }],
        confidence: 'high',
        executionTimeMs: 45,
        rowCount: 1,
        summary: 'Revenue is $1M',
      },
    };
    expect(msg.result?.rowCount).toBe(1);
  });

  it('represents an error message', () => {
    const msg: ChatMessage = {
      role: 'assistant',
      content: '',
      error: 'Query failed',
    };
    expect(msg.error).toBe('Query failed');
  });

  it('represents a loading message', () => {
    const msg: ChatMessage = {
      role: 'assistant',
      content: '',
      loading: true,
    };
    expect(msg.loading).toBe(true);
  });
});

describe('InputRenderProps type contract', () => {
  it('provides all required fields', () => {
    const props: InputRenderProps = {
      value: 'test query',
      onChange: () => {},
      onSubmit: () => {},
      loading: false,
      dryRun: false,
      onDryRunChange: () => {},
    };
    expect(props.value).toBe('test query');
    expect(props.loading).toBe(false);
  });
});

describe('ChartSpec type contract', () => {
  it('supports bar chart', () => {
    const spec: ChartSpec = {
      type: 'bar',
      data: {
        labels: ['A'],
        datasets: [{ label: 'val', data: [1] }],
      },
    };
    expect(spec.type).toBe('bar');
  });

  it('supports line chart', () => {
    const spec: ChartSpec = {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb'],
        datasets: [{ label: 'revenue', data: [100, 200] }],
      },
    };
    expect(spec.type).toBe('line');
  });

  it('supports pie chart', () => {
    const spec: ChartSpec = {
      type: 'pie',
      data: {
        labels: ['Cat A', 'Cat B'],
        datasets: [{ label: 'share', data: [60, 40] }],
      },
    };
    expect(spec.type).toBe('pie');
  });

  it('supports optional chart options passthrough', () => {
    const spec: ChartSpec = {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: { responsive: true, scales: { y: { beginAtZero: true } } },
    };
    expect(spec.options).toBeDefined();
  });

  it('supports all chart types from the union', () => {
    const types: ChartSpec['type'][] = ['bar', 'line', 'pie', 'scatter', 'table'];
    expect(types).toHaveLength(5);
  });
});
