import type { Datalogue } from 'datalogue';

/**
 * NestJS-compatible Datalogue service and controller factory.
 *
 * NestJS doesn't allow external packages to use decorators cleanly (they need
 * the same runtime instance), so we export a factory that creates a plain
 * service object + handler functions. The developer wires them into their
 * own @Module/@Controller.
 *
 * Usage:
 *   import { createDatalogueService } from 'datalogue-integrations/nestjs';
 *
 *   const datalogueService = createDatalogueService({ datalogue: qm });
 *
 *   @Controller('api')
 *   class QueryController {
 *     @Post('query')
 *     query(@Body() body, @Req() req) {
 *       return datalogueService.query(body.question, {
 *         userId: req.user?.id,
 *         dryRun: body.dryRun,
 *       });
 *     }
 *
 *     @Get('suggest')
 *     suggest(@Query('count') count?: string) {
 *       return datalogueService.suggest(Number(count) || 5);
 *     }
 *   }
 */
export interface DatalogueNestOptions {
  datalogue: Datalogue;
}

export interface DatalogueService {
  query(
    question: string,
    options?: { userId?: string; sessionId?: string; dryRun?: boolean; outputFormats?: string[] },
  ): Promise<unknown>;
  suggest(count?: number): Promise<{ suggestions: string[] }>;
  close(): Promise<void>;
}

export function createDatalogueService(opts: DatalogueNestOptions): DatalogueService {
  return {
    async query(question, options) {
      if (!question || typeof question !== 'string') {
        throw new Error('Missing "question"');
      }
      return opts.datalogue.query(question, {
        userId: options?.userId,
        sessionId: options?.sessionId,
        dryRun: options?.dryRun,
        outputFormats: options?.outputFormats as import('datalogue').OutputFormat[] | undefined,
      });
    },
    async suggest(count = 5) {
      const suggestions = await opts.datalogue.suggestQueries(count);
      return { suggestions };
    },
    async close() {
      await opts.datalogue.close();
    },
  };
}
