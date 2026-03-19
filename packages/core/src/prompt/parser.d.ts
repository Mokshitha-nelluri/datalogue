import type { Confidence } from '../types.js';
export interface ParsedResponse {
    sql: string;
    summary: string;
    confidence: Confidence;
}
export declare function parseAIResponse(raw: string): ParsedResponse;
export declare function downgradeConfidence(c: Confidence): Confidence;
//# sourceMappingURL=parser.d.ts.map