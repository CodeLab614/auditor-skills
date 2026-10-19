import { createServer } from 'node:http';

const host = '127.0.0.1';
const port = Number(process.env.SENTRY_COLLECTOR_PORT ?? '3102');
let envelopes: string[] = [];

const server = createServer((request, response) => {
  response.setHeader('access-control-allow-origin', '*');
  response.setHeader('access-control-allow-headers', '*');
  response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');

  if (request.method === 'OPTIONS') {
    response.writeHead(204).end();
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'content-type': 'text/plain' }).end('ok');
    return;
  }

  if (request.method === 'GET' && request.url === '/events') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(envelopes));
    return;
  }

  if (request.method === 'POST' && request.url === '/reset') {
    envelopes = [];
    response.writeHead(204).end();
    return;
  }

  if (request.method === 'POST' && request.url?.startsWith('/api/')) {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      envelopes.push(Buffer.concat(chunks).toString('utf8'));
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{}');
    });
    return;
  }

  response.writeHead(404).end();
});

server.listen(port, host);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
