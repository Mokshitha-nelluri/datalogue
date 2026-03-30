import type { Datalogue, OutputFormat } from 'datalogue';

export interface DatalogueNextOptions {
  datalogue: Datalogue;
  getUserId?: (req: Request) => string | undefined;
  getSessionId?: (req: Request) => string | undefined;
}

/**
 * Create Next.js App Router route handlers for Datalogue.
 *
 * Usage in app/api/query/route.ts:
 *   import { createDatalogueHandlers } from 'datalogue-integrations/next';
 *   const { POST, GET } = createDatalogueHandlers({ datalogue: qm });
 *   export { POST, GET };
 */
export function createDatalogueHandlers(opts: DatalogueNextOptions) {
  const POST = async (req: Request) => {
    try {
      const body = (await req.json()) as Record<string, unknown>;
      const question = body?.question;
      if (!question || typeof question !== 'string') {
        return Response.json({ error: 'Missing "question" in request body' }, { status: 400 });
      }
      const result = await opts.datalogue.query(question, {
        userId: opts.getUserId?.(req),
        sessionId: opts.getSessionId?.(req),
        dryRun: body?.dryRun === true,
        outputFormats: body?.outputFormats as OutputFormat[] | undefined,
      });
      return Response.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const code = (err as { code?: string })?.code;
      return Response.json(
        { error: message, code },
        { status: code === 'RATE_LIMIT_EXCEEDED' ? 429 : 500 },
      );
    }
  };

  const GET = async (req: Request) => {
    try {
      const url = new URL(req.url);
      const count = Number(url.searchParams.get('count')) || 5;
      const suggestions = await opts.datalogue.suggestQueries(count);
      return Response.json({ suggestions });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return Response.json({ error: message }, { status: 500 });
    }
  };

  return { POST, GET };
}
