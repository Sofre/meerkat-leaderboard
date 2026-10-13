// Local development server: runs the same handlers Vercel runs in production.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };

const routes = [
  [/^\/api\/login$/, () => require('./api/login'), () => ({})],
  [/^\/api\/players$/, () => require('./api/players/index'), () => ({})],
  [/^\/api\/players\/([^/]+)$/, () => require('./api/players/[id]'), (m) => ({ id: decodeURIComponent(m[1]) })],
];

function readBody(req) {
  return new Promise((resolve) => {
    let s = '';
    req.on('data', (c) => { s += c; if (s.length > 1e5) req.destroy(); });
    req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch { resolve({}); } });
  });
}

http.createServer(async (req, res) => {
  const p = new URL(req.url, 'http://x').pathname;

  for (const [re, handler, query] of routes) {
    const m = p.match(re);
    if (!m) continue;
    req.body = await readBody(req);
    req.query = query(m);
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
    return handler()(req, res);
  }

  if (req.method === 'GET' && !p.startsWith('/api/')) {
    const file = path.join(PUBLIC, p === '/' ? 'index.html' : p);
    if (file.startsWith(PUBLIC) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      return fs.createReadStream(file).pipe(res);
    }
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(path.join(PUBLIC, '404.html')).pipe(res);
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}).listen(PORT, () => console.log(`Leaderboard running at http://localhost:${PORT}`));
