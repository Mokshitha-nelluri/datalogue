import { describe, it, expect, vi } from 'vitest';
import { createAuditLogger, logAuditEntry } from '../../src/security/audit.js';
import type { AuditEntry } from '../../src/types.js';

const sampleEntry: AuditEntry = {
  timestamp: '2026-03-18T12:00:00.000Z',
  userId: 'user-1',
  naturalLanguageQuery: 'show me top orders',
  generatedSQL: 'SELECT * FROM orders ORDER BY total DESC LIMIT 10',
  rowCount: 10,
  executionTimeMs: 42,
  blocked: false,
};

describe('createAuditLogger', () => {
  it('returns a no-op when disabled', () => {
    const logger = createAuditLogger(false);
    // Should not throw
    logger(sampleEntry);
  });

  it('uses custom function when provided', () => {
    const customFn = vi.fn();
    const logger = createAuditLogger(true, customFn);
    logger(sampleEntry);
    expect(customFn).toHaveBeenCalledWith(sampleEntry);
  });

  it('writes JSON to stdout by default', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const logger = createAuditLogger(true);
    logger(sampleEntry);
    expect(writeSpy).toHaveBeenCalledOnce();
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).toContain('"blocked":false');
    expect(output).toContain('"userId":"user-1"');
    writeSpy.mockRestore();
  });
});

describe('logAuditEntry', () => {
  it('calls the default logger', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    logAuditEntry(sampleEntry);
    expect(writeSpy).toHaveBeenCalledOnce();
    writeSpy.mockRestore();
  });

  it('calls custom function when provided', () => {
    const customFn = vi.fn();
    logAuditEntry(sampleEntry, customFn);
    expect(customFn).toHaveBeenCalledWith(sampleEntry);
  });
});
