import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { makeWorker } from '../worker/handler.mjs';
import { createLocalDb } from './local-db.mjs';
const root = path.resolve(import.meta.dirname, '..');
await mkdir(path.join(root, '.preview'), { recursive: true });
const { sqlite, binding } = createLocalDb(path.join(root, '.preview/enquiries.sqlite'));
const files = { '/index.html': ['index.html', 'text/html; charset=utf-8'], '/styles.css': ['styles.css', 'text/css; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/image.png': ['image.png', 'image/png'], '/assets/favicon.svg': ['assets/favicon.svg', 'image/svg+xml'] };
const assets = {};
const server = createServer(async (incoming, outgoing) => {
  try {
    for (const [url, [file, type]] of Object.entries(files)) { const buffer = await readFile(path.join(root, file)); const encoding = file.endsWith('.png') ? 'base64' : 'utf8'; assets[url] = { body: buffer.toString(encoding), type, encoding }; }
    const chunks = []; let size = 0;
    for await (const chunk of incoming) { size += chunk.length; if (size > 20000) { outgoing.writeHead(413); outgoing.end('Request too large'); return; } chunks.push(chunk); }
    const request = new Request('http://' + incoming.headers.host + incoming.url, { method: incoming.method, headers: incoming.headers, ...(chunks.length ? { body: Buffer.concat(chunks) } : {}) });
    const response = await makeWorker(assets).fetch(request, { DB: binding });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch { outgoing.writeHead(500, { 'Content-Type': 'text/plain' }); outgoing.end('Preview error. See your local project configuration.'); }
});
server.listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173'));
process.on('SIGINT', () => { server.close(); sqlite.close(); process.exit(0); });
