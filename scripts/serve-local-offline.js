/* eslint-env node, browser */
/* Local-only static server for offline fieldwork testing of the production bundle (web-build/).
 * Binds to loopback only. Browser fieldwork is enabled by config.js ('local') only on loopback hosts,
 * so this never enables production synchronization. Service workers are allowed on http://localhost. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', 'web-build');
const port = Number(process.env.PORT || 3000);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json',
  '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8','.map':'application/json'};
if (!fs.existsSync(path.join(root, 'index.html'))) { console.error('Run "npm run build" first (web-build/index.html is missing).'); process.exit(1); }
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
  // The worker script itself must never be served stale, or shell updates would stall.
  const noStore = /fieldwork-worker\.js$|index\.html$|config\.js$/.test(file);
  res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': noStore ? 'no-store' : 'no-cache',
    'X-Content-Type-Options': 'nosniff'});
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Local offline test server: http://localhost:${port}/ (loopback only)`));
