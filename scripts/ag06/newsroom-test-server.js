const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const newsroom = require('../../api/newsroom.js');

const root = path.resolve(__dirname, '../..');
const port = Number(process.env.PORT || 4173);
const mime = {
  '.html':'text/html; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml',
  '.webmanifest':'application/manifest+json; charset=utf-8'
};

const tlsKeyPath = process.env.AG06_TEST_TLS_KEY || '';
const tlsCertPath = process.env.AG06_TEST_TLS_CERT || '';
const useTls = Boolean(tlsKeyPath && tlsCertPath);

const handler = async (req,res) => {
  try {
    const url = new URL(req.url, useTls ? 'https://localhost' : 'http://127.0.0.1');
    if (url.pathname === '/api/newsroom') return newsroom(req,res);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const absolute = path.resolve(root, '.' + pathname);
    if (!absolute.startsWith(root + path.sep)) {
      res.statusCode = 403;
      return res.end('Forbidden');
    }
    const stat = fs.existsSync(absolute) ? fs.statSync(absolute) : null;
    if (!stat || !stat.isFile()) {
      res.statusCode = 404;
      return res.end('Not Found');
    }
    res.setHeader('Content-Type', mime[path.extname(absolute)] || 'application/octet-stream');
    res.setHeader('Cache-Control','no-store');
    fs.createReadStream(absolute).pipe(res);
  } catch {
    res.statusCode=500;
    res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify({error:'AG-06 certification gateway failure'}));
  }
};

const server = useTls
  ? https.createServer({ key: fs.readFileSync(tlsKeyPath), cert: fs.readFileSync(tlsCertPath) }, handler)
  : http.createServer(handler);

server.listen(port,'127.0.0.1',()=>process.stdout.write(`AG06_TEST_SERVER_READY scheme=${useTls?'https':'http'} port=${port}\n`));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
