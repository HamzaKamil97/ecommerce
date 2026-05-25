const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'web-build');
const PORT = process.env.PORT ? Number(process.env.PORT) : 19009;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'text/plain', 'Not found');
    send(res, 200, MIME[ext] || 'application/octet-stream', data);
  });
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const directHit = path.join(ROOT, urlPath);
  const htmlGuess = path.join(ROOT, urlPath + '.html');
  fs.stat(htmlGuess, (e1) => {
    if (!e1) return serveFile(res, htmlGuess);
    fs.stat(directHit, (e2, stat) => {
      if (!e2) {
        if (stat.isDirectory()) {
          const dirIndex = path.join(directHit, 'index.html');
          if (fs.existsSync(dirIndex)) return serveFile(res, dirIndex);
        } else {
          return serveFile(res, directHit);
        }
      }
      const parts = urlPath.split('/').filter(Boolean);
      while (parts.length > 0) {
        parts.pop();
        const guess = path.join(ROOT, parts.join('/'), '[id].html');
        if (fs.existsSync(guess)) return serveFile(res, guess);
        const slugGuess = path.join(ROOT, parts.join('/'), '[slug].html');
        if (fs.existsSync(slugGuess)) return serveFile(res, slugGuess);
      }
      serveFile(res, path.join(ROOT, 'index.html'));
    });
  });
});

server.listen(PORT, () => console.log('Hanoot web preview: http://localhost:' + PORT));
