import type { Message } from '../types.js';
/**
 * Multi-turn conversation context manager.
 * Bounded by maxHistoryLength (oldest-first eviction) and TTL (expired sessions pruned).
 */
export declare class ContextManager {
    private readonly maxHistoryLength;
    private readonly ttlMinutes;
    private readonly sessions;
    constructor(maxHistoryLength?: number, ttlMinutes?: number);
    /**
     * Get conversation history for a session.
     * Returns empty array for unknown or expired sessions.
     * Refreshes lastAccess on access.
     */
    getHistory(sessionId: string): Message[];
    /**
     * Append a message to a session's history.
     * Creates the session if it doesn't exist.
     * Evicts oldest messages when maxHistoryLength is exceeded.
     */
    addMessage(sessionId: string, message: Message): void;
    /**
     * Remove all expired sessions (TTL-based eviction).
     */
    prune(): void;
    /**
     * Clear a specific session's history.
     */
    clearSession(sessionId: string): void;
}
//# sourceMappingURL=manager.d.ts.map