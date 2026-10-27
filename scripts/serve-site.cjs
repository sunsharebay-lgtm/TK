#!/usr/bin/env node
// 本地验证服务：并发请求不受 Python http.server 的连接队列限制。
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || '.site');
const port = Number(process.argv[3] || 8123);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.statSync(file).isDirectory()) {
      if (!url.pathname.endsWith('/')) { res.writeHead(301, { Location: url.pathname + '/' + url.search }).end(); return; }
      file = path.join(file, 'index.html');
    }
    // Preserve GitHub Pages filename case semantics on macOS too.
    let directory = root;
    for (const name of path.relative(root, file).split(path.sep)) {
      if (!fs.readdirSync(directory).includes(name)) throw new Error('case mismatch');
      directory = path.join(directory, name);
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Serving ${root} at http://127.0.0.1:${port}/`));
