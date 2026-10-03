import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8790);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml', '.ttf':'font/ttf' };
const server = http.createServer((req,res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  let requested;
  try { requested = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname); } catch { res.writeHead(400); res.end(); return; }
  const file = path.resolve(root,'.'+(requested==='/'?'/index.html':requested));
  if (!file.startsWith(root+path.sep)) { res.writeHead(403); res.end(); return; }
  fs.realpath(file,(error,real) => {
    if (error || !real.startsWith(root+path.sep)) { res.writeHead(404); res.end('Not found'); return; }
    fs.stat(real,(error,stat) => {
      if(error || !stat.isFile()) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200,{'Content-Type':types[path.extname(real)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      if(req.method==='HEAD') { res.end(); return; }
      fs.createReadStream(real).pipe(res);
    });
  });
});
server.listen(port,'127.0.0.1',()=>console.log('K Coffee Dashboard: http://127.0.0.1:'+port+'/index.html'));
