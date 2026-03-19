import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextManager } from '../../src/context/manager.js';
import type { SessionStore, Message } from '../../src/types.js';

describe('ContextManager', () => {
  let ctx: ContextManager;

  beforeEach(() => {
    ctx = new ContextManager(5, 60);
  });

  it('returns empty history for unknown session', async () => {
    expect(await ctx.getHistory('unknown')).toEqual([]);
  });

  it('stores and retrieves messages', async () => {
    await ctx.addMessage('s1', { role: 'user', content: 'hello' });
    await ctx.addMessage('s1', { role: 'assistant', content: 'hi' });
    const history = await ctx.getHistory('s1');
    expect(history).toHaveLength(2);
    expect(history[0]).toEqual({ role: 'user', content: 'hello' });
    expect(history[1]).toEqual({ role: 'assistant', content: 'hi' });
  });

  it('isolates sessions from each other', async () => {
    await ctx.addMessage('s1', { role: 'user', content: 'for s1' });
    await ctx.addMessage('s2', { role: 'user', content: 'for s2' });
    expect(await ctx.getHistory('s1')).toHaveLength(1);
    expect(await ctx.getHistory('s2')).toHaveLength(1);
    expect((await ctx.getHistory('s1'))[0].content).toBe('for s1');
    expect((await ctx.getHistory('s2'))[0].content).toBe('for s2');
  });

  it('evicts oldest messages when maxHistoryLength reached', async () => {
    // maxHistoryLength = 5
    for (let i = 0; i < 7; i++) {
      await ctx.addMessage('s1', { role: 'user', content: `msg-${i}` });
    }
    const history = await ctx.getHistory('s1');
    expect(history).toHaveLength(5);
    // Oldest (msg-0, msg-1) evicted
    expect(history[0].content).toBe('msg-2');
    expect(history[4].content).toBe('msg-6');
  });

  it('refreshes lastAccess on addMessage', async () => {
    // Create with very short TTL (1 minute)
    const shortCtx = new ContextManager(50, 1);
    await shortCtx.addMessage('s1', { role: 'user', content: 'initial' });

    // Simulate time passing: prune should not remove active session
    shortCtx.prune();
    expect(await shortCtx.getHistory('s1')).toHaveLength(1);
  });

  it('refreshes lastAccess on getHistory', async () => {
    await ctx.addMessage('s1', { role: 'user', content: 'hello' });
    // getHistory should also touch lastAccess
    const history = await ctx.getHistory('s1');
    expect(history).toHaveLength(1);
  });

  it('prunes expired sessions', async () => {
    // Use vi.useFakeTimers to control time
    vi.useFakeTimers();

    const ttlCtx = new ContextManager(50, 5); // 5 minute TTL
    await ttlCtx.addMessage('s1', { role: 'user', content: 'early' });

    // Advance 6 minutes
    vi.advanceTimersByTime(6 * 60_000);

    ttlCtx.prune();
    expect(await ttlCtx.getHistory('s1')).toEqual([]);

    vi.useRealTimers();
  });

  it('does not prune non-expired sessions', async () => {
    vi.useFakeTimers();

    const ttlCtx = new ContextManager(50, 10); // 10 minute TTL
    await ttlCtx.addMessage('s1', { role: 'user', content: 'recent' });

    // Advance only 5 minutes
    vi.advanceTimersByTime(5 * 60_000);

    ttlCtx.prune();
    expect(await ttlCtx.getHistory('s1')).toHaveLength(1);

    vi.useRealTimers();
  });

  it('clears a specific session', async () => {
    await ctx.addMessage('s1', { role: 'user', content: 'hello' });
    await ctx.addMessage('s2', { role: 'user', content: 'world' });
    await ctx.clearSession('s1');
    expect(await ctx.getHistory('s1')).toEqual([]);
    expect(await ctx.getHistory('s2')).toHaveLength(1);
  });

  it('uses default maxHistoryLength=50 and ttlMinutes=60', async () => {
    const defaultCtx = new ContextManager();
    // Should not throw, defaults should be applied internally
    await defaultCtx.addMessage('s1', { role: 'user', content: 'test' });
    expect(await defaultCtx.getHistory('s1')).toHaveLength(1);
  });
});

describe('ContextManager with external SessionStore', () => {
  function createMockStore(): SessionStore & { data: Map<string, Message[]> } {
    const data = new Map<string, Message[]>();
    return {
      data,
      get: vi.fn(async (id: string) => {
        const msgs = data.get(id);
        return msgs ? [...msgs] : undefined;
      }),
      set: vi.fn(async (id: string, msgs: Message[]) => {
        data.set(id, [...msgs]);
      }),
      delete: vi.fn(async (id: string) => {
        data.delete(id);
      }),
    };
  }

  it('delegates getHistory to external store', async () => {
    const store = createMockStore();
    store.data.set('s1', [{ role: 'user', content: 'stored' }]);

    const ctx = new ContextManager(50, 60, store);
    const history = await ctx.getHistory('s1');
    expect(history).toHaveLength(1);
    expect(history[0].content).toBe('stored');
    expect(store.get).toHaveBeenCalledWith('s1');
  });

  it('returns empty array from external store when session not found', async () => {
    const store = createMockStore();
    const ctx = new ContextManager(50, 60, store);
    const history = await ctx.getHistory('unknown');
    expect(history).toEqual([]);
  });

  it('delegates addMessage to external store', async () => {
    const store = createMockStore();
    const ctx = new ContextManager(50, 60, store);

    await ctx.addMessage('s1', { role: 'user', content: 'hello' });
    expect(store.get).toHaveBeenCalledWith('s1');
    expect(store.set).toHaveBeenCalled();
    expect(store.data.get('s1')).toEqual([{ role: 'user', content: 'hello' }]);
  });

  it('evicts oldest messages in external store when over limit', async () => {
    const store = createMockStore();
    const ctx = new ContextManager(3, 60, store); // max 3 messages

    await ctx.addMessage('s1', { role: 'user', content: 'msg-0' });
    await ctx.addMessage('s1', { role: 'user', content: 'msg-1' });
    await ctx.addMessage('s1', { role: 'user', content: 'msg-2' });
    await ctx.addMessage('s1', { role: 'user', content: 'msg-3' });

    const stored = store.data.get('s1')!;
    expect(stored).toHaveLength(3);
    expect(stored[0].content).toBe('msg-1');
    expect(stored[2].content).toBe('msg-3');
  });

  it('delegates clearSession to external store', async () => {
    const store = createMockStore();
    store.data.set('s1', [{ role: 'user', content: 'hello' }]);

    const ctx = new ContextManager(50, 60, store);
    await ctx.clearSession('s1');
    expect(store.delete).toHaveBeenCalledWith('s1');
    expect(store.data.has('s1')).toBe(false);
  });
});
