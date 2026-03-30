import type { Context } from 'hono';
import type { Datalogue } from 'datalogue';

export interface DatalogueHonoOptions {
  datalogue: Datalogue;
  getUserId?: (c: Context) => string | undefined;
  getSessionId?: (c: Context) => string | undefined;
}

/**
 * Create Hono route handlers for Datalogue.
 *
 * Usage:
 *   import { Hono } from 'hono';
 *   import { datalogueHandlers } from 'datalogue-integrations/hono';
 *   const app = new Hono();
 *   const handlers = datalogueHandlers({ datalogue: qm });
 *   app.post('/api/query', handlers.query);
 *   app.get('/api/suggest', handlers.suggest);
 */
export function datalogueHandlers(opts: DatalogueHonoOptions) {
  return {
    query: async (c: Context) => {
      try {
        const body = await c.req.json<Record<string, unknown>>();
        const question = body?.question;
        if (!question || typeof question !== 'string') {
          return c.json({ error: 'Missing "question" in request body' }, 400);
        }
        const result = await opts.datalogue.query(question, {
          userId: opts.getUserId?.(c),
          sessionId: opts.getSessionId?.(c),
          dryRun: body?.dryRun === true,
          outputFormats: body?.outputFormats as string[] | undefined,
        });
        return c.json(result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const code = (err as { code?: string })?.code;
        return c.json({ error: message, code }, code === 'RATE_LIMIT_EXCEEDED' ? 429 : 500);
      }
    },
    suggest: async (c: Context) => {
      try {
        const count = Number(c.req.query('count')) || 5;
        const suggestions = await opts.datalogue.suggestQueries(count);
        return c.json({ suggestions });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return c.json({ error: message }, 500);
      }
    },
  };
}
