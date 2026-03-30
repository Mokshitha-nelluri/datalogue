import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryBox } from '../../src/QueryBox.js';
import type { QueryBoxAPI, QueryResult } from '../../src/QueryBox.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MOCK_RESULT: QueryResult = {
  sql: 'SELECT name FROM customers LIMIT 10',
  rows: [{ name: 'Acme' }, { name: 'Globex' }],
  summary: 'Top 2 customers found.',
  confidence: 'high',
  executionTimeMs: 42,
  rowCount: 2,
};

function mockFetchSuccess(result: QueryResult = MOCK_RESULT) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(result),
    text: () => Promise.resolve(JSON.stringify(result)),
  });
}

function mockFetchError(status: number, body: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.reject(new Error('not json')),
    text: () => Promise.resolve(body),
  });
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetchSuccess());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ─── Rendering ───────────────────────────────────────────────────────────────

describe('QueryBox rendering', () => {
  it('renders with default placeholder', () => {
    render(<QueryBox endpoint="/api/query" />);
    const textarea = screen.getByPlaceholderText('Ask a question about your data...');
    expect(textarea).toBeDefined();
  });

  it('renders with custom placeholder', () => {
    render(<QueryBox endpoint="/api/query" placeholder="Ask anything..." />);
    const textarea = screen.getByPlaceholderText('Ask anything...');
    expect(textarea).toBeDefined();
  });

  it('renders the Ask button', () => {
    render(<QueryBox endpoint="/api/query" />);
    const button = screen.getByRole('button', { name: 'Ask' });
    expect(button).toBeDefined();
  });

  it('renders suggestion buttons when provided', () => {
    render(
      <QueryBox
        endpoint="/api/query"
        suggestions={['Top customers', 'Monthly revenue']}
      />,
    );
    expect(screen.getByText('Top customers')).toBeDefined();
    expect(screen.getByText('Monthly revenue')).toBeDefined();
    expect(screen.getByText('Try asking:')).toBeDefined();
  });

  it('does not render suggestions when messages exist', () => {
    render(
      <QueryBox
        endpoint="/api/query"
        suggestions={['Top customers']}
        initialMessages={[{ role: 'user', content: 'hello' }]}
      />,
    );
    expect(screen.queryByText('Try asking:')).toBeNull();
    expect(screen.getByText('hello')).toBeDefined();
  });

  it('renders initialMessages', () => {
    render(
      <QueryBox
        endpoint="/api/query"
        initialMessages={[
          { role: 'user', content: 'What is revenue?' },
          { role: 'assistant', content: 'Revenue is $1M' },
        ]}
      />,
    );
    expect(screen.getByText('What is revenue?')).toBeDefined();
    expect(screen.getByText('Revenue is $1M')).toBeDefined();
  });

  it('renders dry-run toggle when showDryRunToggle is true', () => {
    render(<QueryBox endpoint="/api/query" showDryRunToggle />);
    expect(screen.getByText('Dry run (preview SQL only)')).toBeDefined();
  });

  it('does not render dry-run toggle by default', () => {
    render(<QueryBox endpoint="/api/query" />);
    expect(screen.queryByText('Dry run (preview SQL only)')).toBeNull();
  });

  it('applies custom className', () => {
    const { container } = render(
      <QueryBox endpoint="/api/query" className="my-custom-class" />,
    );
    expect(container.firstElementChild?.className).toBe('my-custom-class');
  });
});

// ─── Custom renderers ───────────────────────────────────────────────────────

describe('QueryBox custom renderers', () => {
  it('calls renderEmpty when no messages and no suggestions', () => {
    render(
      <QueryBox
        endpoint="/api/query"
        renderEmpty={() => <div>No data yet!</div>}
      />,
    );
    expect(screen.getByText('No data yet!')).toBeDefined();
  });

  it('calls renderError for error messages', async () => {
    vi.stubGlobal('fetch', mockFetchError(500, 'Server error'));

    render(
      <QueryBox
        endpoint="/api/query"
        renderError={(err) => <div data-testid="custom-error">Custom: {err}</div>}
      />,
    );

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'test query');
    fireEvent.submit(textarea.closest('form')!);

    await waitFor(() => {
      expect(screen.getByTestId('custom-error')).toBeDefined();
      expect(screen.getByText('Custom: Server error')).toBeDefined();
    });
  });

  it('calls renderMessage for each message', () => {
    render(
      <QueryBox
        endpoint="/api/query"
        initialMessages={[
          { role: 'user', content: 'test' },
          { role: 'assistant', content: 'response' },
        ]}
        renderMessage={(msg, i) => (
          <div key={i} data-testid={`custom-msg-${i}`}>
            [{msg.role}] {msg.content}
          </div>
        )}
      />,
    );
    expect(screen.getByTestId('custom-msg-0').textContent).toBe('[user] test');
    expect(screen.getByTestId('custom-msg-1').textContent).toBe('[assistant] response');
  });

  it('calls renderInput to replace the default input area', () => {
    render(
      <QueryBox
        endpoint="/api/query"
        renderInput={({ value, onChange, onSubmit, loading }) => (
          <div data-testid="custom-input">
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              data-testid="custom-field"
            />
            <button onClick={onSubmit} disabled={loading}>
              Go
            </button>
          </div>
        )}
      />,
    );
    expect(screen.getByTestId('custom-input')).toBeDefined();
    expect(screen.getByTestId('custom-field')).toBeDefined();
    expect(screen.getByText('Go')).toBeDefined();
    // Default textarea should not exist
    expect(screen.queryByPlaceholderText('Ask a question about your data...')).toBeNull();
  });
});

// ─── Query submission ───────────────────────────────────────────────────────

describe('QueryBox submission', () => {
  it('sends a POST request on form submit and shows result', async () => {
    const fetchMock = mockFetchSuccess();
    vi.stubGlobal('fetch', fetchMock);
    const onResult = vi.fn();

    render(<QueryBox endpoint="/api/query" onResult={onResult} />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'top customers');
    fireEvent.submit(textarea.closest('form')!);

    // User message appears immediately
    expect(screen.getByText('top customers')).toBeDefined();

    await waitFor(() => {
      // Fetch was called with correct params
      expect(fetchMock).toHaveBeenCalledWith('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'top customers', dryRun: false }),
      });
      // Assistant message appears
      expect(screen.getByText('Top 2 customers found.')).toBeDefined();
      // onResult callback fired
      expect(onResult).toHaveBeenCalledWith(MOCK_RESULT);
    });
  });

  it('sends custom headers when provided', async () => {
    const fetchMock = mockFetchSuccess();
    vi.stubGlobal('fetch', fetchMock);

    render(
      <QueryBox
        endpoint="/api/query"
        headers={{ Authorization: 'Bearer tok123' }}
      />,
    );

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'test');
    fireEvent.submit(textarea.closest('form')!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/query', expect.objectContaining({
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok123' },
      }));
    });
  });

  it('shows loading state while query is in-flight', async () => {
    // Never-resolving fetch to keep loading indefinitely
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(new Promise(() => {})),
    );

    render(<QueryBox endpoint="/api/query" />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'test query');
    fireEvent.submit(textarea.closest('form')!);

    await waitFor(() => {
      // Loading indicator shown
      expect(screen.getByText('Thinking...')).toBeDefined();
      // Submit button shows loading text
      expect(screen.getByRole('button', { name: '...' })).toBeDefined();
    });
  });

  it('shows error when fetch fails', async () => {
    vi.stubGlobal('fetch', mockFetchError(500, 'Internal error'));
    const onError = vi.fn();

    render(<QueryBox endpoint="/api/query" onError={onError} />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'bad query');
    fireEvent.submit(textarea.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Error: Internal error')).toBeDefined();
      expect(onError).toHaveBeenCalled();
    });
  });

  it('does not submit empty queries', async () => {
    const fetchMock = mockFetchSuccess();
    vi.stubGlobal('fetch', fetchMock);

    render(<QueryBox endpoint="/api/query" />);

    // Submit with empty input
    const button = screen.getByRole('button', { name: 'Ask' });
    fireEvent.click(button);

    // fetch should NOT have been called
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clears input after submission', async () => {
    vi.stubGlobal('fetch', mockFetchSuccess());

    render(<QueryBox endpoint="/api/query" />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await userEvent.type(textarea, 'test query');
    expect(textarea.value).toBe('test query');

    fireEvent.submit(textarea.closest('form')!);

    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });
});

// ─── Confidence badge ───────────────────────────────────────────────────────

describe('QueryBox confidence display', () => {
  it('shows confidence badge on result when showConfidence is true', async () => {
    vi.stubGlobal('fetch', mockFetchSuccess());

    render(<QueryBox endpoint="/api/query" showConfidence />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'query');
    fireEvent.submit(textarea.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('high')).toBeDefined();
      expect(screen.getByText(/2 rows/)).toBeDefined();
      expect(screen.getByText(/42ms/)).toBeDefined();
    });
  });
});

// ─── Suggestion clicks ─────────────────────────────────────────────────────

describe('QueryBox suggestion interaction', () => {
  it('clicking a suggestion submits that query', async () => {
    const fetchMock = mockFetchSuccess();
    vi.stubGlobal('fetch', fetchMock);

    render(
      <QueryBox
        endpoint="/api/query"
        suggestions={['Top customers']}
      />,
    );

    fireEvent.click(screen.getByText('Top customers'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/query', expect.objectContaining({
        body: JSON.stringify({ question: 'Top customers', dryRun: false }),
      }));
    });
  });
});

// ─── Hooks: onBeforeSubmit, transformRequest, transformResponse ──────────────

describe('QueryBox hooks', () => {
  it('onBeforeSubmit can cancel a query', async () => {
    const fetchMock = mockFetchSuccess();
    vi.stubGlobal('fetch', fetchMock);

    render(
      <QueryBox
        endpoint="/api/query"
        onBeforeSubmit={() => false}
      />,
    );

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'blocked query');
    fireEvent.submit(textarea.closest('form')!);

    // Give it a tick
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('onBeforeSubmit can transform the query', async () => {
    const fetchMock = mockFetchSuccess();
    vi.stubGlobal('fetch', fetchMock);

    render(
      <QueryBox
        endpoint="/api/query"
        onBeforeSubmit={(q) => `modified: ${q}`}
      />,
    );

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'original');
    fireEvent.submit(textarea.closest('form')!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/query', expect.objectContaining({
        body: JSON.stringify({ question: 'modified: original', dryRun: false }),
      }));
    });
  });

  it('transformRequest reshapes the request body', async () => {
    const fetchMock = mockFetchSuccess();
    vi.stubGlobal('fetch', fetchMock);

    render(
      <QueryBox
        endpoint="/api/query"
        transformRequest={(body) => ({ ...body, userId: 'u1', sessionId: 's1' })}
      />,
    );

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'test');
    fireEvent.submit(textarea.closest('form')!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/query', expect.objectContaining({
        body: JSON.stringify({ question: 'test', dryRun: false, userId: 'u1', sessionId: 's1' }),
      }));
    });
  });

  it('transformResponse extracts result from wrapped API response', async () => {
    const wrappedFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { result: MOCK_RESULT } }),
      text: () => Promise.resolve(''),
    });
    vi.stubGlobal('fetch', wrappedFetch);
    const onResult = vi.fn();

    render(
      <QueryBox
        endpoint="/api/query"
        transformResponse={(data) => (data as { data: { result: QueryResult } }).data.result}
        onResult={onResult}
      />,
    );

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'test');
    fireEvent.submit(textarea.closest('form')!);

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(MOCK_RESULT);
      expect(screen.getByText('Top 2 customers found.')).toBeDefined();
    });
  });

  it('onMessagesChange fires when messages update', async () => {
    vi.stubGlobal('fetch', mockFetchSuccess());
    const onMessagesChange = vi.fn();

    render(
      <QueryBox endpoint="/api/query" onMessagesChange={onMessagesChange} />,
    );

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'test');
    fireEvent.submit(textarea.closest('form')!);

    await waitFor(() => {
      // Should have been called with settled messages (no loading)
      const lastCall = onMessagesChange.mock.calls[onMessagesChange.mock.calls.length - 1][0];
      expect(lastCall.length).toBe(2); // user + assistant
      expect(lastCall[0].role).toBe('user');
      expect(lastCall[1].role).toBe('assistant');
      expect(lastCall[1].result).toBeDefined();
    });
  });
});

// ─── Imperative API ─────────────────────────────────────────────────────────

describe('QueryBox imperative API', () => {
  it('onReady provides submit and clear methods', async () => {
    const fetchMock = mockFetchSuccess();
    vi.stubGlobal('fetch', fetchMock);
    let api: QueryBoxAPI | undefined;

    render(
      <QueryBox
        endpoint="/api/query"
        onReady={(a) => { api = a; }}
      />,
    );

    expect(api).toBeDefined();
    expect(typeof api!.submit).toBe('function');
    expect(typeof api!.clear).toBe('function');

    // Programmatic submit
    api!.submit('programmatic query');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/query', expect.objectContaining({
        body: JSON.stringify({ question: 'programmatic query', dryRun: false }),
      }));
      expect(screen.getByText('programmatic query')).toBeDefined();
    });
  });

  it('clear removes all messages', async () => {
    vi.stubGlobal('fetch', mockFetchSuccess());
    let api: QueryBoxAPI | undefined;

    render(
      <QueryBox
        endpoint="/api/query"
        initialMessages={[
          { role: 'user', content: 'old question' },
          { role: 'assistant', content: 'old answer' },
        ]}
        onReady={(a) => { api = a; }}
      />,
    );

    expect(screen.getByText('old question')).toBeDefined();
    expect(screen.getByText('old answer')).toBeDefined();

    // Clear
    api!.clear();

    await waitFor(() => {
      expect(screen.queryByText('old question')).toBeNull();
      expect(screen.queryByText('old answer')).toBeNull();
    });
  });
});
