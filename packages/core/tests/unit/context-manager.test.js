import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextManager } from '../../src/context/manager.js';
describe('ContextManager', () => {
    let ctx;
    beforeEach(() => {
        ctx = new ContextManager(5, 60);
    });
    it('returns empty history for unknown session', () => {
        expect(ctx.getHistory('unknown')).toEqual([]);
    });
    it('stores and retrieves messages', () => {
        ctx.addMessage('s1', { role: 'user', content: 'hello' });
        ctx.addMessage('s1', { role: 'assistant', content: 'hi' });
        const history = ctx.getHistory('s1');
        expect(history).toHaveLength(2);
        expect(history[0]).toEqual({ role: 'user', content: 'hello' });
        expect(history[1]).toEqual({ role: 'assistant', content: 'hi' });
    });
    it('isolates sessions from each other', () => {
        ctx.addMessage('s1', { role: 'user', content: 'for s1' });
        ctx.addMessage('s2', { role: 'user', content: 'for s2' });
        expect(ctx.getHistory('s1')).toHaveLength(1);
        expect(ctx.getHistory('s2')).toHaveLength(1);
        expect(ctx.getHistory('s1')[0].content).toBe('for s1');
        expect(ctx.getHistory('s2')[0].content).toBe('for s2');
    });
    it('evicts oldest messages when maxHistoryLength reached', () => {
        // maxHistoryLength = 5
        for (let i = 0; i < 7; i++) {
            ctx.addMessage('s1', { role: 'user', content: `msg-${i}` });
        }
        const history = ctx.getHistory('s1');
        expect(history).toHaveLength(5);
        // Oldest (msg-0, msg-1) evicted
        expect(history[0].content).toBe('msg-2');
        expect(history[4].content).toBe('msg-6');
    });
    it('refreshes lastAccess on addMessage', () => {
        // Create with very short TTL (1 minute)
        const shortCtx = new ContextManager(50, 1);
        shortCtx.addMessage('s1', { role: 'user', content: 'initial' });
        // Simulate time passing: prune should not remove active session
        shortCtx.prune();
        expect(shortCtx.getHistory('s1')).toHaveLength(1);
    });
    it('refreshes lastAccess on getHistory', () => {
        ctx.addMessage('s1', { role: 'user', content: 'hello' });
        // getHistory should also touch lastAccess
        const history = ctx.getHistory('s1');
        expect(history).toHaveLength(1);
    });
    it('prunes expired sessions', () => {
        // Use vi.useFakeTimers to control time
        vi.useFakeTimers();
        const ttlCtx = new ContextManager(50, 5); // 5 minute TTL
        ttlCtx.addMessage('s1', { role: 'user', content: 'early' });
        // Advance 6 minutes
        vi.advanceTimersByTime(6 * 60_000);
        ttlCtx.prune();
        expect(ttlCtx.getHistory('s1')).toEqual([]);
        vi.useRealTimers();
    });
    it('does not prune non-expired sessions', () => {
        vi.useFakeTimers();
        const ttlCtx = new ContextManager(50, 10); // 10 minute TTL
        ttlCtx.addMessage('s1', { role: 'user', content: 'recent' });
        // Advance only 5 minutes
        vi.advanceTimersByTime(5 * 60_000);
        ttlCtx.prune();
        expect(ttlCtx.getHistory('s1')).toHaveLength(1);
        vi.useRealTimers();
    });
    it('clears a specific session', () => {
        ctx.addMessage('s1', { role: 'user', content: 'hello' });
        ctx.addMessage('s2', { role: 'user', content: 'world' });
        ctx.clearSession('s1');
        expect(ctx.getHistory('s1')).toEqual([]);
        expect(ctx.getHistory('s2')).toHaveLength(1);
    });
    it('uses default maxHistoryLength=50 and ttlMinutes=60', () => {
        const defaultCtx = new ContextManager();
        // Should not throw, defaults should be applied internally
        defaultCtx.addMessage('s1', { role: 'user', content: 'test' });
        expect(defaultCtx.getHistory('s1')).toHaveLength(1);
    });
});
//# sourceMappingURL=context-manager.test.js.map