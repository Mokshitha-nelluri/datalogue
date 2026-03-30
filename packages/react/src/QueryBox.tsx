import { useState, useRef, useEffect, useCallback } from 'react';
import type { ReactElement, CSSProperties, FormEvent, KeyboardEvent } from 'react';
import { ResultView } from './ResultView.js';

// ─── Types re-declared to avoid depending on core at runtime ─────────────────

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

// ─── QueryBox Props ─────────────────────────────────────────────────────────

export interface QueryBoxProps {
  /** API endpoint to POST queries to */
  endpoint: string;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Visual theme */
  theme?: 'light' | 'dark';
  /** Example queries to show as clickable suggestions */
  suggestions?: string[];
  /** Enable a dry-run preview toggle */
  showDryRunToggle?: boolean;
  /** Show confidence badge on results */
  showConfidence?: boolean;
  /** Called when a successful result is received */
  onResult?: (result: QueryResult) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Custom headers for the fetch request */
  headers?: Record<string, string>;
  /** Override styles on the root container */
  style?: CSSProperties;
  /** Override className on the root container */
  className?: string;
  /** Render chart / table / SQL inline inside each chat bubble */
  showInlineResults?: boolean;
  /** Pre-populate the chat with saved messages (e.g. from localStorage or a DB) */
  initialMessages?: ChatMessage[];
  /** Called whenever the messages array changes — use to persist conversation history */
  onMessagesChange?: (messages: ChatMessage[]) => void;
  /** Intercept a query before it's sent. Return a modified string, or false to cancel. */
  onBeforeSubmit?: (query: string) => string | false | Promise<string | false>;
  /** Transform the fetch request body — add userId, sessionId, or match your own API shape */
  transformRequest?: (body: { question: string; dryRun: boolean }) => Record<string, unknown>;
  /** Transform the API response into a QueryResult — use when your API wraps the result */
  transformResponse?: (data: unknown) => QueryResult;
  /** Ref callback that receives imperative methods (submit, clear) */
  onReady?: (api: QueryBoxAPI) => void;
  /** Custom render for the empty state (shown when no messages and no suggestions) */
  renderEmpty?: () => ReactElement;
  /** Custom render for the loading indicator inside assistant bubbles */
  renderLoading?: () => ReactElement;
  /** Custom render for error messages inside assistant bubbles */
  renderError?: (error: string) => ReactElement;
  /** Custom render for each message */
  renderMessage?: (message: ChatMessage, index: number) => ReactElement;
  /** Custom render for the input area */
  renderInput?: (props: InputRenderProps) => ReactElement;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  result?: QueryResult;
  error?: string;
  loading?: boolean;
}

export interface InputRenderProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  dryRun: boolean;
  onDryRunChange: (value: boolean) => void;
}

/** Imperative methods exposed via onReady callback */
export interface QueryBoxAPI {
  /** Programmatically submit a query */
  submit: (query: string) => void;
  /** Clear all messages */
  clear: () => void;
}

// ─── Default styles ─────────────────────────────────────────────────────────

const LIGHT_THEME = {
  bg: '#ffffff',
  border: '#e2e8f0',
  text: '#1a202c',
  textSecondary: '#718096',
  inputBg: '#ffffff',
  inputBorder: '#cbd5e0',
  userBubble: '#ebf4ff',
  assistantBubble: '#f7fafc',
  accent: '#3182ce',
  accentHover: '#2b6cb0',
  badgeHigh: '#38a169',
  badgeMedium: '#d69e2e',
  badgeLow: '#e53e3e',
  suggestion: '#edf2f7',
  suggestionHover: '#e2e8f0',
};

const DARK_THEME = {
  bg: '#1a202c',
  border: '#2d3748',
  text: '#e2e8f0',
  textSecondary: '#a0aec0',
  inputBg: '#2d3748',
  inputBorder: '#4a5568',
  userBubble: '#2a4365',
  assistantBubble: '#2d3748',
  accent: '#63b3ed',
  accentHover: '#4299e1',
  badgeHigh: '#48bb78',
  badgeMedium: '#ecc94b',
  badgeLow: '#fc8181',
  suggestion: '#2d3748',
  suggestionHover: '#4a5568',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function QueryBox({
  endpoint,
  placeholder = 'Ask a question about your data...',
  theme = 'light',
  suggestions,
  showDryRunToggle = false,
  showConfidence = true,
  onResult,
  onError,
  headers,
  style,
  className,
  showInlineResults = false,
  initialMessages,
  onMessagesChange,
  onBeforeSubmit,
  transformRequest,
  transformResponse,
  onReady,
  renderEmpty,
  renderLoading,
  renderError,
  renderMessage,
  renderInput,
}: QueryBoxProps): ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const colors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Notify parent whenever messages change (skip loading placeholders)
  useEffect(() => {
    if (onMessagesChange) {
      const settled = messages.filter((m) => !m.loading);
      onMessagesChange(settled);
    }
  }, [messages, onMessagesChange]);

  const submit = useCallback(
    async (query: string) => {
      if (!query.trim() || loading) return;

      // Hook: let developer intercept/transform/cancel the query
      let finalQuery = query;
      if (onBeforeSubmit) {
        const result = await onBeforeSubmit(query);
        if (result === false) return; // cancelled
        finalQuery = result;
      }

      const userMsg: ChatMessage = { role: 'user', content: finalQuery };
      const loadingMsg: ChatMessage = {
        role: 'assistant',
        content: '',
        loading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setInput('');
      setLoading(true);

      try {
        const defaultBody = { question: finalQuery, dryRun };
        const body = transformRequest ? transformRequest(defaultBody) : defaultBody;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const resBody = await res.text();
          throw new Error(resBody || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const result: QueryResult = transformResponse ? transformResponse(data) : data;

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: result.summary ?? result.sql,
          result,
        };

        setMessages((prev) => [
          ...prev.slice(0, -1), // remove loading placeholder
          assistantMsg,
        ]);

        onResult?.(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const errorMsg: ChatMessage = {
          role: 'assistant',
          content: '',
          error: error.message,
        };

        setMessages((prev) => [...prev.slice(0, -1), errorMsg]);
        onError?.(error);
      } finally {
        setLoading(false);
      }
    },
    [endpoint, headers, dryRun, loading, onResult, onError, onBeforeSubmit, transformRequest, transformResponse],
  );

  const clear = useCallback(() => {
    setMessages([]);
    setInput('');
  }, []);

  // Expose imperative API to parent
  useEffect(() => {
    if (onReady) {
      onReady({ submit, clear });
    }
  }, [onReady, submit, clear]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  };

  // ─── Render helpers ─────────────────────────────────────────────────────

  const renderConfidenceBadge = (confidence: QueryResult['confidence']) => {
    const badgeColors = {
      high: colors.badgeHigh,
      medium: colors.badgeMedium,
      low: colors.badgeLow,
    };
    return (
      <span
        style={{
          display: 'inline-block',
          fontSize: '11px',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: '9999px',
          color: '#fff',
          backgroundColor: badgeColors[confidence],
          marginLeft: '8px',
        }}
      >
        {confidence}
      </span>
    );
  };

  const renderDefaultMessage = (msg: ChatMessage, idx: number) => {
    if (renderMessage) return renderMessage(msg, idx);

    const isUser = msg.role === 'user';

    return (
      <div
        key={idx}
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            maxWidth: !isUser && showInlineResults ? '95%' : '80%',
            padding: '10px 14px',
            borderRadius: '12px',
            backgroundColor: isUser ? colors.userBubble : colors.assistantBubble,
            color: colors.text,
            fontSize: '14px',
            lineHeight: '1.5',
            border: `1px solid ${colors.border}`,
          }}
        >
          {msg.loading && (
            renderLoading ? renderLoading() : <span style={{ color: colors.textSecondary }}>Thinking...</span>
          )}
          {msg.error && (
            renderError ? renderError(msg.error) : <span style={{ color: colors.badgeLow }}>Error: {msg.error}</span>
          )}
          {!msg.loading && !msg.error && (
            <>
              <div>{msg.content}</div>
              {msg.result && showConfidence && (
                <div style={{ marginTop: '6px' }}>
                  {renderConfidenceBadge(msg.result.confidence)}
                  {msg.result.dryRun && (
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '11px',
                        color: colors.textSecondary,
                        fontStyle: 'italic',
                      }}
                    >
                      dry run
                    </span>
                  )}
                  <span
                    style={{
                      marginLeft: '8px',
                      fontSize: '11px',
                      color: colors.textSecondary,
                    }}
                  >
                    {msg.result.rowCount} rows &middot;{' '}
                    {msg.result.executionTimeMs}ms
                  </span>
                </div>
              )}
              {msg.result?.sql && !showInlineResults && (
                <details style={{ marginTop: '8px' }}>
                  <summary
                    style={{
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: colors.textSecondary,
                    }}
                  >
                    View SQL
                  </summary>
                  <pre
                    style={{
                      marginTop: '4px',
                      padding: '8px',
                      borderRadius: '6px',
                      backgroundColor:
                        theme === 'dark' ? '#1a202c' : '#f7fafc',
                      fontSize: '12px',
                      overflowX: 'auto',
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {msg.result.sql}
                  </pre>
                </details>
              )}
              {msg.result && showInlineResults && (
                <div style={{ marginTop: '10px' }}>
                  <ResultView
                    result={msg.result}
                    theme={theme}
                    showSummary={false}
                    showCSVDownload
                    style={{ border: 'none', borderRadius: '8px' }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // ─── Main render ────────────────────────────────────────────────────────

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        overflow: 'hidden',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        ...style,
      }}
    >
      {/* Messages area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
        }}
      >
        {messages.length === 0 && renderEmpty && !suggestions?.length && renderEmpty()}
        {messages.length === 0 && suggestions && suggestions.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <p
              style={{
                fontSize: '13px',
                color: colors.textSecondary,
                marginBottom: '8px',
              }}
            >
              Try asking:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => submit(s)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.suggestion,
                    color: colors.text,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      colors.suggestionHover)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = colors.suggestion)
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => renderDefaultMessage(msg, idx))}
      </div>

      {/* Input area */}
      <div
        style={{
          borderTop: `1px solid ${colors.border}`,
          padding: '12px 16px',
          backgroundColor: colors.bg,
        }}
      >
        {renderInput ? (
          renderInput({
            value: input,
            onChange: setInput,
            onSubmit: () => submit(input),
            loading,
            dryRun,
            onDryRunChange: setDryRun,
          })
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {showDryRunToggle && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: colors.textSecondary,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                  />
                  Dry run (preview SQL only)
                </label>
              )}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={1}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.inputBorder}`,
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  fontSize: '14px',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: loading || !input.trim() ? colors.inputBorder : colors.accent,
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? '...' : 'Ask'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
