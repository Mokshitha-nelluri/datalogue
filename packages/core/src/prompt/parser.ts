import type { Confidence } from '../types.js';
import { DatalogueError } from '../errors.js';

export interface ParsedResponse {
  sql: string;
  summary: string;
  confidence: Confidence;
}

export function parseAIResponse(raw: string): ParsedResponse {
  const trimmed = raw.trim();

  // Check for CANNOT_ANSWER
  if (trimmed.startsWith('CANNOT_ANSWER:')) {
    const reason = trimmed.slice('CANNOT_ANSWER:'.length).trim();
    throw new DatalogueError(
      `Cannot answer this question: ${reason}`,
      'AI_PROVIDER_ERROR',
    );
  }

  // Extract SQL — split on "SQL:" delimiter
  const sqlIndex = trimmed.indexOf('SQL:');
  if (sqlIndex === -1) {
    throw new DatalogueError(
      'AI response did not contain a SQL: section',
      'AI_PROVIDER_ERROR',
    );
  }
  const sql = trimmed.slice(sqlIndex + 4).trim();
  const preamble = trimmed.slice(0, sqlIndex);

  // Extract EXPLANATION
  let summary = '';
  const explanationMatch = preamble.match(/EXPLANATION:\s*(.+)/i);
  if (explanationMatch) {
    summary = explanationMatch[1].trim();
  }

  // Extract CONFIDENCE
  let confidence: Confidence = 'medium';
  const confidenceMatch = preamble.match(/CONFIDENCE:\s*(HIGH|MEDIUM|LOW)/i);
  if (confidenceMatch) {
    confidence = confidenceMatch[1].toLowerCase() as Confidence;
  }

  return { sql, summary, confidence };
}

export function downgradeConfidence(c: Confidence): Confidence {
  if (c === 'high') return 'medium';
  return 'low';
}
