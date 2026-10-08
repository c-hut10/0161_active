const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

/* Local preview: serve this project on loopback without third-party dependencies. */
const root = path.resolve(__dirname, '..');
const port = Number(process.argv[2] || 5502);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Supply a port number between 1 and 65535.');
}

/* Explicit file types: browsers receive image headers rather than download headers. */
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, {Allow: 'GET, HEAD'});
    response.end('Local preview cannot accept form submissions.');
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname.split('/').some(segment => segment.startsWith('.'))) {
      response.writeHead(403);
      response.end('Not available in the preview.');
      return;
    }
    /* Restrict file access to the project, including the targets of symbolic links. */
    const file = await fs.promises.realpath(path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`));
    if (!file.startsWith(root + path.sep)) {
      response.writeHead(403);
      response.end('Not available in the preview.');
      return;
    }
    const stat = await fs.promises.stat(file);
    if (!stat.isFile()) throw new Error('Not a file');
    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    if (request.method === 'HEAD') response.end();
    else fs.createReadStream(file).on('error', () => response.destroy()).pipe(response);
  } catch {
    response.writeHead(404);
    response.end('File not found.');
  }
});

/* Start and stop: leave live hosting unchanged and exit clearly if the port is occupied. */
server.on('error', error => {
  console.error(`Preview could not start: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Local preview: http://127.0.0.1:${port}/`));
