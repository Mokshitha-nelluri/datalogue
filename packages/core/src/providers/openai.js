import { DatalogueError } from '../errors.js';
export class OpenAIProvider {
    apiKey;
    model;
    constructor(apiKey, model = 'gpt-4o') {
        this.apiKey = apiKey;
        this.model = model;
    }
    async complete(systemPrompt, userMessage, history) {
        // Dynamic import so the SDK is only loaded if the user configures OpenAI
        const { default: OpenAI } = await import('openai');
        const client = new OpenAI({ apiKey: this.apiKey });
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.map((m) => ({
                role: m.role,
                content: m.content,
            })),
            { role: 'user', content: userMessage },
        ];
        try {
            const response = await client.chat.completions.create({
                model: this.model,
                messages,
                max_tokens: 1024,
            });
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new DatalogueError('AI provider returned no text content', 'AI_PROVIDER_ERROR');
            }
            return content;
        }
        catch (err) {
            if (err instanceof DatalogueError)
                throw err;
            throw new DatalogueError(`OpenAI API call failed: ${err instanceof Error ? err.message : String(err)}`, 'AI_PROVIDER_ERROR');
        }
    }
}
//# sourceMappingURL=openai.js.map