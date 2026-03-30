import { Command } from 'commander';
import { startServer } from './server.js';

const program = new Command();

program
  .name('datalogue')
  .description('Natural language database querying')
  .version('0.1.0');

program
  .command('serve')
  .description('Start a web UI for querying your database with natural language')
  .requiredOption('--db <url>', 'Database connection string (postgres://..., mysql://..., or path to .db file)')
  .requiredOption('--allowed-tables <tables>', 'Comma-separated list of allowed tables')
  .option('--port <port>', 'Port to listen on', '3001')
  .option('--ai <provider>', 'AI provider: anthropic or openai', 'anthropic')
  .option('--api-key <key>', 'AI API key (or set ANTHROPIC_API_KEY / OPENAI_API_KEY env var)')
  .option('--model <model>', 'AI model override')
  .option('--allow-mutations', 'Allow INSERT/UPDATE/DELETE queries', false)
  .action(async (opts) => {
    const port = Number(opts.port) || 3001;
    const tables = (opts.allowedTables as string).split(',').map((t: string) => t.trim()).filter(Boolean);

    if (tables.length === 0) {
      console.error('Error: --allowed-tables must contain at least one table');
      process.exit(1);
    }

    await startServer({
      db: opts.db as string,
      allowedTables: tables,
      port,
      aiProvider: opts.ai as 'anthropic' | 'openai',
      apiKey: opts.apiKey as string | undefined,
      model: opts.model as string | undefined,
      allowMutations: opts.allowMutations === true,
    });
  });

program.parse();
