import type { AIProvider, Message } from '../types.js';
export declare class OpenAIProvider implements AIProvider {
    private readonly apiKey;
    private readonly model;
    constructor(apiKey: string, model?: string);
    complete(systemPrompt: string, userMessage: string, history: Message[]): Promise<string>;
}
//# sourceMappingURL=openai.d.ts.map