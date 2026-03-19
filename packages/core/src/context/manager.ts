import type { Message, SessionStore } from '../types.js';

interface Session {
  messages: Message[];
  lastAccess: number;
}

/**
 * Multi-turn conversation context manager.
 * Bounded by maxHistoryLength (oldest-first eviction) and TTL (expired sessions pruned).
 * Supports pluggable external store (Redis, DB, etc.) via SessionStore interface.
 * Falls back to in-memory Map when no store is provided.
 */
export class ContextManager {
  private readonly sessions = new Map<string, Session>();
  private readonly externalStore: SessionStore | undefined;

  constructor(
    private readonly maxHistoryLength: number = 50,
    private readonly ttlMinutes: number = 60,
    externalStore?: SessionStore,
  ) {
    this.externalStore = externalStore;
  }

  /**
   * Get conversation history for a session.
   * Returns empty array for unknown or expired sessions.
   * Refreshes lastAccess on access.
   */
  async getHistory(sessionId: string): Promise<Message[]> {
    if (this.externalStore) {
      const messages = await this.externalStore.get(sessionId);
      return messages?.slice(-this.maxHistoryLength) ?? [];
    }

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
  async addMessage(sessionId: string, message: Message): Promise<void> {
    if (this.externalStore) {
      const existing = (await this.externalStore.get(sessionId)) ?? [];
      existing.push(message);
      while (existing.length > this.maxHistoryLength) {
        existing.shift();
      }
      const ttlMs = this.ttlMinutes * 60_000;
      await this.externalStore.set(sessionId, existing, ttlMs);
      return;
    }

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
  async clearSession(sessionId: string): Promise<void> {
    if (this.externalStore) {
      await this.externalStore.delete(sessionId);
      return;
    }
    this.sessions.delete(sessionId);
  }
}
