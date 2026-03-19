/**
 * Multi-turn conversation context manager.
 * Bounded by maxHistoryLength (oldest-first eviction) and TTL (expired sessions pruned).
 */
export class ContextManager {
    maxHistoryLength;
    ttlMinutes;
    sessions = new Map();
    constructor(maxHistoryLength = 50, ttlMinutes = 60) {
        this.maxHistoryLength = maxHistoryLength;
        this.ttlMinutes = ttlMinutes;
    }
    /**
     * Get conversation history for a session.
     * Returns empty array for unknown or expired sessions.
     * Refreshes lastAccess on access.
     */
    getHistory(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return [];
        // Check TTL
        const ttlMs = this.ttlMinutes * 60_000;
        if (Date.now() - session.lastAccess > ttlMs) {
            this.sessions.delete(sessionId);
            return [];
        }
        session.lastAccess = Date.now();
        return [...session.messages];
    }
    /**
     * Append a message to a session's history.
     * Creates the session if it doesn't exist.
     * Evicts oldest messages when maxHistoryLength is exceeded.
     */
    addMessage(sessionId, message) {
        let session = this.sessions.get(sessionId);
        if (!session) {
            session = { messages: [], lastAccess: Date.now() };
            this.sessions.set(sessionId, session);
        }
        session.messages.push(message);
        session.lastAccess = Date.now();
        // Evict oldest if over limit
        while (session.messages.length > this.maxHistoryLength) {
            session.messages.shift();
        }
    }
    /**
     * Remove all expired sessions (TTL-based eviction).
     */
    prune() {
        const now = Date.now();
        const ttlMs = this.ttlMinutes * 60_000;
        for (const [id, session] of this.sessions) {
            if (now - session.lastAccess > ttlMs) {
                this.sessions.delete(id);
            }
        }
    }
    /**
     * Clear a specific session's history.
     */
    clearSession(sessionId) {
        this.sessions.delete(sessionId);
    }
}
//# sourceMappingURL=manager.js.map