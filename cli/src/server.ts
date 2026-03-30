import { Datalogue } from 'datalogue';

export interface ServeOptions {
  db: string;
  allowedTables: string[];
  port: number;
  aiProvider: 'anthropic' | 'openai';
  apiKey?: string;
  model?: string;
  allowMutations: boolean;
}

function resolveDbConfig(db: string) {
  if (db.startsWith('postgres://') || db.startsWith('postgresql://')) {
    return { type: 'postgres' as const, connectionString: db };
  }
  if (db.startsWith('mysql://')) {
    // Parse mysql://user:pass@host:port/database
    const url = new URL(db);
    return {
      type: 'mysql' as const,
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
    };
  }
  if (db.startsWith('mssql://')) {
    const url = new URL(db);
    return {
      type: 'mssql' as const,
      server: url.hostname,
      port: url.port ? Number(url.port) : 1433,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
    };
  }
  // Default: treat as SQLite file path
  return { type: 'sqlite' as const, filepath: db };
}

function resolveAiConfig(provider: 'anthropic' | 'openai', apiKey?: string, model?: string) {
  const key =
    apiKey ??
    (provider === 'anthropic'
      ? process.env.ANTHROPIC_API_KEY
      : process.env.OPENAI_API_KEY);

  if (!key) {
    console.error(
      `Error: No API key found. Pass --api-key or set ${provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'} env var.`,
    );
    process.exit(1);
  }
  return { type: provider, apiKey: key, ...(model ? { model } : {}) };
}

const CHAT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Datalogue</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; height: 100vh; display: flex; flex-direction: column; }
  header { background: #1a1a2e; color: white; padding: 16px 24px; font-size: 18px; font-weight: 600; }
  .chat { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 12px; }
  .msg { max-width: 80%; padding: 12px 16px; border-radius: 12px; line-height: 1.5; font-size: 14px; }
  .msg.user { align-self: flex-end; background: #1a1a2e; color: white; }
  .msg.assistant { align-self: flex-start; background: white; border: 1px solid #e0e0e0; }
  .msg pre { background: #f0f0f0; padding: 8px; border-radius: 6px; overflow-x: auto; margin: 8px 0; font-size: 13px; }
  .msg table { border-collapse: collapse; margin: 8px 0; font-size: 13px; }
  .msg th, .msg td { border: 1px solid #ddd; padding: 4px 8px; text-align: left; }
  .msg th { background: #f0f0f0; }
  .input-row { display: flex; gap: 8px; padding: 16px 24px; background: white; border-top: 1px solid #e0e0e0; }
  .input-row input { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; }
  .input-row input:focus { border-color: #1a1a2e; }
  .input-row button { padding: 12px 24px; background: #1a1a2e; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
  .input-row button:disabled { opacity: 0.5; cursor: not-allowed; }
  .confidence { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-bottom: 4px; }
  .confidence.high { background: #d4edda; color: #155724; }
  .confidence.medium { background: #fff3cd; color: #856404; }
  .confidence.low { background: #f8d7da; color: #721c24; }
</style>
</head>
<body>
<header>Datalogue</header>
<div class="chat" id="chat"></div>
<div class="input-row">
  <input type="text" id="input" placeholder="Ask a question about your data..." autofocus />
  <button id="send" onclick="send()">Send</button>
</div>
<script>
const chat = document.getElementById('chat');
const input = document.getElementById('input');
const btn = document.getElementById('send');
input.addEventListener('keydown', e => { if (e.key === 'Enter' && !btn.disabled) send(); });

function addMsg(role, html) {
  const d = document.createElement('div');
  d.className = 'msg ' + role;
  d.innerHTML = html;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

function rowsToTable(rows) {
  if (!rows || rows.length === 0) return '';
  const keys = Object.keys(rows[0]);
  let h = '<table><tr>' + keys.map(k => '<th>' + k + '</th>').join('') + '</tr>';
  rows.slice(0, 50).forEach(r => { h += '<tr>' + keys.map(k => '<td>' + (r[k] ?? '') + '</td>').join('') + '</tr>'; });
  if (rows.length > 50) h += '<tr><td colspan="' + keys.length + '">... ' + (rows.length - 50) + ' more rows</td></tr>';
  h += '</table>';
  return h;
}

async function send() {
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  btn.disabled = true;
  addMsg('user', q);
  try {
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q }),
    });
    const data = await res.json();
    if (data.error) { addMsg('assistant', '<b>Error:</b> ' + data.error); return; }
    let html = '';
    if (data.confidence) html += '<span class="confidence ' + data.confidence + '">' + data.confidence + '</span><br>';
    if (data.summary) html += data.summary + '<br>';
    if (data.sql) html += '<pre>' + data.sql + '</pre>';
    html += rowsToTable(data.rows);
    addMsg('assistant', html);
  } catch (e) { addMsg('assistant', '<b>Error:</b> ' + e.message); }
  finally { btn.disabled = false; input.focus(); }
}
</script>
</body>
</html>`;

export async function startServer(opts: ServeOptions): Promise<void> {
  // Dynamic import express — it's a peer dependency of the CLI
  let express: typeof import('express');
  try {
    express = await import('express');
  } catch {
    console.error('Error: express is required. Install it: npm install express');
    process.exit(1);
  }

  const app = (express.default ?? express)();
  app.use((express.default ?? express).json());

  const dbConfig = resolveDbConfig(opts.db);
  const aiConfig = resolveAiConfig(opts.aiProvider, opts.apiKey, opts.model);

  const qm = new Datalogue({
    db: dbConfig,
    ai: aiConfig,
    allowedTables: opts.allowedTables,
    allowMutations: opts.allowMutations,
  } as ConstructorParameters<typeof Datalogue>[0]);

  // Serve the chat UI
  app.get('/', (_req: unknown, res: { type: (t: string) => { send: (b: string) => void } }) => {
    res.type('html').send(CHAT_HTML);
  });

  // Query endpoint
  app.post('/api/query', async (req: { body?: { question?: string; dryRun?: boolean } }, res: { status: (s: number) => { json: (b: unknown) => void }; json: (b: unknown) => void }) => {
    try {
      const { question, dryRun } = req.body ?? {};
      if (!question || typeof question !== 'string') {
        res.status(400).json({ error: 'Missing "question"' });
        return;
      }
      const result = await qm.query(question, { dryRun: dryRun === true });
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  });

  // Suggest endpoint
  app.get('/api/suggest', async (_req: unknown, res: { json: (b: unknown) => void; status: (s: number) => { json: (b: unknown) => void } }) => {
    try {
      const suggestions = await qm.suggestQueries();
      res.json({ suggestions });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  });

  app.listen(opts.port, () => {
    console.log(`\n  Datalogue is running at http://localhost:${opts.port}\n`);
    console.log(`  Database: ${opts.db}`);
    console.log(`  Allowed tables: ${opts.allowedTables.join(', ')}`);
    console.log(`  AI provider: ${opts.aiProvider}\n`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    await qm.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
