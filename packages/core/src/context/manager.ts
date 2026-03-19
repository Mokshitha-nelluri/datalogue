import type { Message } from '../types.js';

interface Session {
  messages: Message[];
  lastAccess: number;
}

/**
 * Multi-turn conversation context manager.
 * Bounded by maxHistoryLength (oldest-first eviction) and TTL (expired sessions pruned).
 */
export class ContextManager {
  private readonly sessions = new Map<string, Session>();

  constructor(
    private readonly maxHistoryLength: number = 50,
    private readonly ttlMinutes: number = 60,
  ) {}

  /**
   * Get conversation history for a session.
   * Returns empty array for unknown or expired sessions.
   * Refreshes lastAccess on access.
   */
  getHistory(sessionId: string): Message[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

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
  addMessage(sessionId: string, message: Message): void {
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
  prune(): void {
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
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
