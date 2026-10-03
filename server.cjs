const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = __dirname;
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const file = path.resolve(root, relative);
    const inside = path.relative(root, file);
    if (inside.startsWith('..') || path.isAbsolute(inside) || inside.split(path.sep).some((part) => part.startsWith('.'))) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': `${types[path.extname(file)] || 'application/octet-stream'}; charset=utf-8` });
    res.end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(4173, '127.0.0.1', () => console.log('Memory Game: http://localhost:4173'));
