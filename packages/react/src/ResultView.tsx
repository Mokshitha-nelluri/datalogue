import { useState, useMemo } from 'react';
import type { ReactElement, CSSProperties } from 'react';

// ─── Types (mirrored from core to avoid runtime dep) ─────────────────────────

export interface QueryResult {
  sql: string;
  rows: Record<string, unknown>[];
  summary?: string;
  chartSpec?: ChartSpec;
  csv?: string;
  confidence: 'high' | 'medium' | 'low';
  executionTimeMs: number;
  rowCount: number;
  dryRun?: boolean;
}

export interface ChartSpec {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'table';
  data: {
    labels: string[];
    datasets: { label: string; data: number[] }[];
  };
  options?: Record<string, unknown>;
}

// ─── ResultView Props ───────────────────────────────────────────────────────

export interface ResultViewProps {
  /** The QueryResult to render */
  result: QueryResult;
  /** Visual theme */
  theme?: 'light' | 'dark';
  /** Show/hide specific sections */
  showSummary?: boolean;
  showChart?: boolean;
  showTable?: boolean;
  showSQL?: boolean;
  showCSVDownload?: boolean;
  /** Max rows to render in the table (default: 100) */
  maxTableRows?: number;
  /** Custom chart renderer — receives chartSpec, render your own chart */
  renderChart?: (chartSpec: ChartSpec) => ReactElement;
  /** Custom table renderer — swap in AG Grid, TanStack Table, etc. */
  renderTable?: (rows: Record<string, unknown>[], columns: string[]) => ReactElement;
  /** Custom SQL renderer — render your own syntax-highlighted SQL block */
  renderSQL?: (sql: string) => ReactElement;
  /** Override styles on the root container */
  style?: CSSProperties;
  /** Override className on the root container */
  className?: string;
}

// ─── Colors ─────────────────────────────────────────────────────────────────

const LIGHT = {
  bg: '#ffffff',
  border: '#e2e8f0',
  text: '#1a202c',
  textSecondary: '#718096',
  tableBg: '#ffffff',
  tableHeaderBg: '#f7fafc',
  tableRowHover: '#edf2f7',
  accent: '#3182ce',
  badgeHigh: '#38a169',
  badgeMedium: '#d69e2e',
  badgeLow: '#e53e3e',
  barColor: '#3182ce',
  barBg: '#edf2f7',
};

const DARK = {
  bg: '#1a202c',
  border: '#2d3748',
  text: '#e2e8f0',
  textSecondary: '#a0aec0',
  tableBg: '#2d3748',
  tableHeaderBg: '#4a5568',
  tableRowHover: '#4a5568',
  accent: '#63b3ed',
  badgeHigh: '#48bb78',
  badgeMedium: '#ecc94b',
  badgeLow: '#fc8181',
  barColor: '#63b3ed',
  barBg: '#4a5568',
};

// ─── Minimal built-in chart renderers (no Chart.js dependency) ──────────────

function BarChartSimple({
  spec,
  colors,
}: {
  spec: ChartSpec;
  colors: typeof LIGHT;
}) {
  const dataset = spec.data.datasets[0];
  if (!dataset) return null;
  const max = Math.max(...dataset.data, 1);

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: colors.textSecondary,
          marginBottom: '8px',
        }}
      >
        {dataset.label}
      </div>
      {spec.data.labels.map((label, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '6px',
          }}
        >
          <div
            style={{
              width: '100px',
              fontSize: '12px',
              color: colors.text,
              textAlign: 'right',
              flexShrink: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={label}
          >
            {label}
          </div>
          <div
            style={{
              flex: 1,
              height: '20px',
              backgroundColor: colors.barBg,
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${(dataset.data[i] / max) * 100}%`,
                backgroundColor: colors.barColor,
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div
            style={{
              width: '60px',
              fontSize: '12px',
              color: colors.textSecondary,
              textAlign: 'right',
              flexShrink: 0,
            }}
          >
            {dataset.data[i]?.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

function LineChartSimple({
  spec,
  colors,
}: {
  spec: ChartSpec;
  colors: typeof LIGHT;
}) {
  const dataset = spec.data.datasets[0];
  if (!dataset || dataset.data.length === 0) return null;

  const width = 400;
  const height = 200;
  const padding = 40;
  const max = Math.max(...dataset.data, 1);
  const min = Math.min(...dataset.data, 0);
  const range = max - min || 1;

  const points = dataset.data.map((val, i) => ({
    x: padding + (i / Math.max(dataset.data.length - 1, 1)) * (width - 2 * padding),
    y: height - padding - ((val - min) / range) * (height - 2 * padding),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: colors.textSecondary,
          marginBottom: '8px',
        }}
      >
        {dataset.label}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth: '500px' }}>
        <path d={pathD} fill="none" stroke={colors.barColor} strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={colors.barColor}>
            <title>
              {spec.data.labels[i]}: {dataset.data[i]}
            </title>
          </circle>
        ))}
        {/* X-axis labels (first and last) */}
        {spec.data.labels.length > 0 && (
          <>
            <text
              x={padding}
              y={height - 8}
              fontSize="10"
              fill={colors.textSecondary}
              textAnchor="start"
            >
              {spec.data.labels[0]}
            </text>
            <text
              x={width - padding}
              y={height - 8}
              fontSize="10"
              fill={colors.textSecondary}
              textAnchor="end"
            >
              {spec.data.labels[spec.data.labels.length - 1]}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

function PieChartSimple({
  spec,
  colors,
}: {
  spec: ChartSpec;
  colors: typeof LIGHT;
}) {
  const dataset = spec.data.datasets[0];
  if (!dataset) return null;

  const total = dataset.data.reduce((a, b) => a + b, 0) || 1;
  const PIE_COLORS = ['#3182ce', '#e53e3e', '#38a169', '#d69e2e', '#805ad5', '#dd6b20', '#319795', '#d53f8c'];
  const size = 160;
  const radius = 70;
  const cx = size / 2;
  const cy = size / 2;

  let cumAngle = -Math.PI / 2;

  const slices = dataset.data.map((val, i) => {
    const angle = (val / total) * 2 * Math.PI;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    return {
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: PIE_COLORS[i % PIE_COLORS.length],
      label: spec.data.labels[i],
      value: val,
      pct: ((val / total) * 100).toFixed(1),
    };
  });

  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={size} height={size}>
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color}>
            <title>
              {s.label}: {s.value} ({s.pct}%)
            </title>
          </path>
        ))}
      </svg>
      <div style={{ fontSize: '12px', color: colors.text }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                backgroundColor: s.color,
              }}
            />
            <span>
              {s.label}: {s.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Table renderer ─────────────────────────────────────────────────────────

function DataTable({
  rows,
  maxRows,
  colors,
}: {
  rows: Record<string, unknown>[];
  maxRows: number;
  colors: typeof LIGHT;
}) {
  if (!rows.length) return null;

  const columns = Object.keys(rows[0]);
  const displayRows = rows.slice(0, maxRows);

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px',
          color: colors.text,
        }}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  backgroundColor: colors.tableHeaderBg,
                  borderBottom: `2px solid ${colors.border}`,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td
                  key={col}
                  style={{
                    padding: '6px 12px',
                    borderBottom: `1px solid ${colors.border}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row[col] === null || row[col] === undefined
                    ? ''
                    : String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > maxRows && (
        <div
          style={{
            padding: '8px 12px',
            fontSize: '12px',
            color: colors.textSecondary,
            textAlign: 'center',
          }}
        >
          Showing {maxRows} of {rows.length} rows
        </div>
      )}
    </div>
  );
}

// ─── CSV download helper ────────────────────────────────────────────────────

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ResultView({
  result,
  theme = 'light',
  showSummary = true,
  showChart = true,
  showTable = true,
  showSQL = true,
  showCSVDownload = true,
  maxTableRows = 100,
  renderChart,
  renderTable,
  renderSQL,
  style,
  className,
}: ResultViewProps): ReactElement {
  const colors = theme === 'dark' ? DARK : LIGHT;
  const [activeTab, setActiveTab] = useState<'chart' | 'table' | 'sql'>('chart');

  const badgeColor = {
    high: colors.badgeHigh,
    medium: colors.badgeMedium,
    low: colors.badgeLow,
  }[result.confidence];

  const hasChart = showChart && result.chartSpec;
  const hasTable = showTable && result.rows.length > 0;
  const hasSQL = showSQL;

  const tabs = useMemo(() => {
    const t: { key: 'chart' | 'table' | 'sql'; label: string }[] = [];
    if (hasChart) t.push({ key: 'chart', label: 'Chart' });
    if (hasTable) t.push({ key: 'table', label: `Table (${result.rowCount})` });
    if (hasSQL) t.push({ key: 'sql', label: 'SQL' });
    return t;
  }, [hasChart, hasTable, hasSQL, result.rowCount]);

  // Default to first available tab
  const effectiveTab = tabs.find((t) => t.key === activeTab) ? activeTab : tabs[0]?.key ?? 'chart';

  const renderBuiltinChart = (spec: ChartSpec) => {
    switch (spec.type) {
      case 'line':
        return <LineChartSimple spec={spec} colors={colors} />;
      case 'pie':
        return <PieChartSimple spec={spec} colors={colors} />;
      case 'bar':
      default:
        return <BarChartSimple spec={spec} colors={colors} />;
    }
  };

  return (
    <div
      className={className}
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        ...style,
      }}
    >
      {/* Header: summary + metadata */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${colors.border}` }}>
        {showSummary && result.summary && (
          <div style={{ fontSize: '15px', color: colors.text, lineHeight: '1.5', marginBottom: '8px' }}>
            {result.summary}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '9999px',
              color: '#fff',
              backgroundColor: badgeColor,
            }}
          >
            {result.confidence}
          </span>
          <span style={{ fontSize: '12px', color: colors.textSecondary }}>
            {result.rowCount} rows &middot; {result.executionTimeMs}ms
          </span>
          {result.dryRun && (
            <span
              style={{
                fontSize: '11px',
                fontStyle: 'italic',
                color: colors.textSecondary,
              }}
            >
              (dry run — not executed)
            </span>
          )}
          {showCSVDownload && result.csv && (
            <button
              type="button"
              onClick={() => downloadCSV(result.csv!, 'query-result.csv')}
              style={{
                marginLeft: 'auto',
                padding: '4px 12px',
                borderRadius: '6px',
                border: `1px solid ${colors.border}`,
                backgroundColor: 'transparent',
                color: colors.accent,
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Download CSV
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {tabs.length > 0 && (
        <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}` }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderBottom:
                  effectiveTab === tab.key
                    ? `2px solid ${colors.accent}`
                    : '2px solid transparent',
                backgroundColor: 'transparent',
                color: effectiveTab === tab.key ? colors.accent : colors.textSecondary,
                fontSize: '13px',
                fontWeight: effectiveTab === tab.key ? 600 : 400,
                cursor: 'pointer',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      <div style={{ padding: '16px' }}>
        {effectiveTab === 'chart' && result.chartSpec && (
          renderChart ? renderChart(result.chartSpec) : renderBuiltinChart(result.chartSpec)
        )}

        {effectiveTab === 'table' && (
          renderTable
            ? renderTable(result.rows, Object.keys(result.rows[0] ?? {}))
            : <DataTable rows={result.rows} maxRows={maxTableRows} colors={colors} />
        )}

        {effectiveTab === 'sql' && (
          renderSQL
            ? renderSQL(result.sql)
            : <pre
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: theme === 'dark' ? '#2d3748' : '#f7fafc',
                  border: `1px solid ${colors.border}`,
                  fontSize: '13px',
                  color: colors.text,
                  overflowX: 'auto',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {result.sql}
              </pre>
        )}
      </div>
    </div>
  );
}
