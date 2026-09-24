'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const webHandler = require('../../api/web');

const dist = path.join(process.cwd(), 'apps/mobile/dist');
const port = Number(process.env.PORT || 4176);

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.json') || file.endsWith('.webmanifest')) return 'application/json; charset=utf-8';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  if (file.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

function staticFile(pathname) {
  const clean = decodeURIComponent(pathname).replace(/\.\./g, '');
  const relative = clean.replace(/^\/+/, '');
  const candidates = clean === '/'
    ? [path.join(dist, 'index.html')]
    : [
        path.join(dist, relative),
        path.join(dist, relative + '.html'),
        path.join(dist, relative, 'index.html')
      ];
  return candidates.find(candidate =>
    candidate.startsWith(dist) &&
    fs.existsSync(candidate) &&
    fs.statSync(candidate).isFile()
  ) || null;
}

const server = http.createServer((req, res) => {
  const original = new URL(req.url, 'http://127.0.0.1:' + port);
  const file = staticFile(original.pathname);

  if (file) {
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType(file));
    return res.end(fs.readFileSync(file));
  }

  req.url = '/api/web?path=' + encodeURIComponent(original.pathname);
  return void webHandler(req, res);
});

server.listen(port, '127.0.0.1', () => {
  console.log('Phase 12 canonical live smoke server listening on http://127.0.0.1:' + port);
});
