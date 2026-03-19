import { DatalogueError } from '../errors.js';
export class AnthropicProvider {
    apiKey;
    model;
    constructor(apiKey, model = 'claude-sonnet-4-6') {
        this.apiKey = apiKey;
        this.model = model;
    }
    async complete(systemPrompt, userMessage, history) {
        // Dynamic import so the SDK is only loaded if the user configures Anthropic
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey: this.apiKey });
        const messages = [
            ...history.map((m) => ({
                role: m.role,
                content: m.content,
            })),
            { role: 'user', content: userMessage },
        ];
        try {
            const response = await client.messages.create({
                model: this.model,
                max_tokens: 1024,
                system: systemPrompt,
                messages,
            });
            const textBlock = response.content.find((b) => b.type === 'text');
            if (!textBlock || textBlock.type !== 'text') {
                throw new DatalogueError('AI provider returned no text content', 'AI_PROVIDER_ERROR');
            }
            return textBlock.text;
        }
        catch (err) {
            if (err instanceof DatalogueError)
                throw err;
            throw new DatalogueError(`Anthropic API call failed: ${err instanceof Error ? err.message : String(err)}`, 'AI_PROVIDER_ERROR');
        }
    }
}
//# sourceMappingURL=anthropic.js.map