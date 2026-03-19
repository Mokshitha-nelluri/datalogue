import type { AIProvider, Message } from '../types.js';
import { DatalogueError } from '../errors.js';

export class OpenAIProvider implements AIProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'gpt-4o',
  ) {}

  async complete(
    systemPrompt: string,
    userMessage: string,
    history: Message[],
  ): Promise<string> {
    // Dynamic import so the SDK is only loaded if the user configures OpenAI
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: this.apiKey });

    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant',
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
        throw new DatalogueError(
          'AI provider returned no text content',
          'AI_PROVIDER_ERROR',
        );
      }
      return content;
    } catch (err) {
      if (err instanceof DatalogueError) throw err;
      throw new DatalogueError(
        `OpenAI API call failed: ${err instanceof Error ? err.message : String(err)}`,
        'AI_PROVIDER_ERROR',
      );
    }
  }
}
