import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Datalogue } from 'datalogue';

export interface DatalogueFastifyOptions {
  datalogue: Datalogue;
  getUserId?: (req: FastifyRequest) => string | undefined;
  getSessionId?: (req: FastifyRequest) => string | undefined;
  prefix?: string;
}

/**
 * Register Datalogue routes as a Fastify plugin.
 *
 * Usage:
 *   import Fastify from 'fastify';
 *   import { dataloguePlugin } from 'datalogue-integrations/fastify';
 *   const app = Fastify();
 *   app.register(dataloguePlugin, { datalogue: qm, prefix: '/api' });
 */
export async function dataloguePlugin(
  fastify: FastifyInstance,
  opts: DatalogueFastifyOptions,
): Promise<void> {
  fastify.post('/query', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      const question = body?.question;
      if (!question || typeof question !== 'string') {
        reply.status(400).send({ error: 'Missing "question" in request body' });
        return;
      }
      const result = await opts.datalogue.query(question as string, {
        userId: opts.getUserId?.(req),
        sessionId: opts.getSessionId?.(req),
        dryRun: body?.dryRun === true,
        outputFormats: body?.outputFormats as string[] | undefined,
      });
      reply.send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const code = (err as { code?: string })?.code;
      reply.status(code === 'RATE_LIMIT_EXCEEDED' ? 429 : 500).send({ error: message, code });
    }
  });

  fastify.get('/suggest', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = req.query as Record<string, unknown>;
      const count = Number(query.count) || 5;
      const suggestions = await opts.datalogue.suggestQueries(count);
      reply.send({ suggestions });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      reply.status(500).send({ error: message });
    }
  });
}
