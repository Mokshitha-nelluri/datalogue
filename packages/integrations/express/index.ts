import type { Router, Request, Response } from 'express';
import type { Datalogue } from 'datalogue';

export interface DatalogueExpressOptions {
  /** Datalogue instance (pre-configured) */
  datalogue: Datalogue;
  /** Extract userId from request (for rate limiting + audit) */
  getUserId?: (req: Request) => string | undefined;
  /** Extract sessionId from request (for multi-turn) */
  getSessionId?: (req: Request) => string | undefined;
}

/**
 * Create a mountable Express router with POST /query and GET /suggest
 *
 * Usage:
 *   import express from 'express';
 *   import { createDatalogueRouter } from 'datalogue-integrations/express';
 *   const app = express();
 *   app.use('/api', createDatalogueRouter({ datalogue: qm }));
 */
export function createDatalogueRouter(opts: DatalogueExpressOptions): Router {
  // Dynamic require so express is not a hard dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Router: ExpressRouter } = require('express') as typeof import('express');
  const router = ExpressRouter();

  router.post('/query', async (req: Request, res: Response) => {
    try {
      const { question, dryRun, outputFormats } = req.body ?? {};
      if (!question || typeof question !== 'string') {
        res.status(400).json({ error: 'Missing "question" in request body' });
        return;
      }
      const result = await opts.datalogue.query(question, {
        userId: opts.getUserId?.(req),
        sessionId: opts.getSessionId?.(req),
        dryRun: dryRun === true,
        outputFormats,
      });
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const code = (err as { code?: string })?.code;
      res.status(code === 'RATE_LIMIT_EXCEEDED' ? 429 : 500).json({ error: message, code });
    }
  });

  router.get('/suggest', async (req: Request, res: Response) => {
    try {
      const count = Number(req.query.count) || 5;
      const suggestions = await opts.datalogue.suggestQueries(count);
      res.json({ suggestions });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  });

  return router;
}
