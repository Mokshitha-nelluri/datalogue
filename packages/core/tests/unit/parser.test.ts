import { describe, it, expect } from 'vitest';
import {
  parseAIResponse,
  downgradeConfidence,
} from '../../src/prompt/parser.js';
import { DatalogueError } from '../../src/errors.js';

describe('parseAIResponse', () => {
  it('parses a well-formed response', () => {
    const raw = `EXPLANATION: Returns the top 10 customers by total spend.
CONFIDENCE: HIGH
SQL:
SELECT customer_name, SUM(total) AS total_spend
FROM orders
GROUP BY customer_name
ORDER BY total_spend DESC
LIMIT 10`;

    const result = parseAIResponse(raw);
    expect(result.summary).toBe(
      'Returns the top 10 customers by total spend.',
    );
    expect(result.confidence).toBe('high');
    expect(result.sql).toContain('SELECT customer_name');
    expect(result.sql).toContain('LIMIT 10');
  });

  it('defaults confidence to medium when missing', () => {
    const raw = `EXPLANATION: Shows all orders.
SQL:
SELECT id FROM orders LIMIT 100`;

    const result = parseAIResponse(raw);
    expect(result.confidence).toBe('medium');
  });

  it('parses LOW confidence', () => {
    const raw = `EXPLANATION: Attempting to infer what was asked.
CONFIDENCE: LOW
SQL:
SELECT id FROM orders LIMIT 10`;

    const result = parseAIResponse(raw);
    expect(result.confidence).toBe('low');
  });

  it('parses MEDIUM confidence case-insensitively', () => {
    const raw = `EXPLANATION: Mid-confidence result.
CONFIDENCE: Medium
SQL:
SELECT id FROM orders LIMIT 10`;

    const result = parseAIResponse(raw);
    expect(result.confidence).toBe('medium');
  });

  it('throws DatalogueError on CANNOT_ANSWER', () => {
    const raw = 'CANNOT_ANSWER: No revenue column exists in the schema.';

    expect(() => parseAIResponse(raw)).toThrow(DatalogueError);
    try {
      parseAIResponse(raw);
    } catch (err) {
      expect(err).toBeInstanceOf(DatalogueError);
      expect((err as DatalogueError).code).toBe('AI_PROVIDER_ERROR');
      expect((err as DatalogueError).message).toContain('No revenue column');
    }
  });

  it('throws DatalogueError when SQL: section is missing', () => {
    const raw = 'EXPLANATION: Here is something but no SQL provided.';

    expect(() => parseAIResponse(raw)).toThrow(DatalogueError);
    try {
      parseAIResponse(raw);
    } catch (err) {
      expect(err).toBeInstanceOf(DatalogueError);
      expect((err as DatalogueError).code).toBe('AI_PROVIDER_ERROR');
    }
  });

  it('handles extra whitespace around SQL', () => {
    const raw = `EXPLANATION: test
CONFIDENCE: HIGH
SQL:

  SELECT id FROM orders LIMIT 10
  `;

    const result = parseAIResponse(raw);
    expect(result.sql).toBe('SELECT id FROM orders LIMIT 10');
  });

  it('handles response with only SQL section', () => {
    const raw = `SQL:
SELECT 1`;

    const result = parseAIResponse(raw);
    expect(result.sql).toBe('SELECT 1');
    expect(result.summary).toBe('');
    expect(result.confidence).toBe('medium');
  });
});

describe('downgradeConfidence', () => {
  it('downgrades high to medium', () => {
    expect(downgradeConfidence('high')).toBe('medium');
  });

  it('downgrades medium to low', () => {
    expect(downgradeConfidence('medium')).toBe('low');
  });

  it('keeps low as low', () => {
    expect(downgradeConfidence('low')).toBe('low');
  });
});
