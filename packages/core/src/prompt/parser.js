import { DatalogueError } from '../errors.js';
export function parseAIResponse(raw) {
    const trimmed = raw.trim();
    // Check for CANNOT_ANSWER
    if (trimmed.startsWith('CANNOT_ANSWER:')) {
        const reason = trimmed.slice('CANNOT_ANSWER:'.length).trim();
        throw new DatalogueError(`Cannot answer this question: ${reason}`, 'AI_PROVIDER_ERROR');
    }
    // Extract SQL — split on "SQL:" delimiter
    const sqlIndex = trimmed.indexOf('SQL:');
    if (sqlIndex === -1) {
        throw new DatalogueError('AI response did not contain a SQL: section', 'AI_PROVIDER_ERROR');
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
    let confidence = 'medium';
    const confidenceMatch = preamble.match(/CONFIDENCE:\s*(HIGH|MEDIUM|LOW)/i);
    if (confidenceMatch) {
        confidence = confidenceMatch[1].toLowerCase();
    }
    return { sql, summary, confidence };
}
export function downgradeConfidence(c) {
    if (c === 'high')
        return 'medium';
    return 'low';
}
//# sourceMappingURL=parser.js.map