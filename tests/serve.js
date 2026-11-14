// A tiny static server for the repo root, like GitHub Pages serves it. Used by the tests.
// `node serve.js 4173` runs it; the offline test also starts and stops its own copy.
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8" };
function serve(port = 0){
  const server = http.createServer((req, res) => {
    let file = path.normalize(path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname)));
    if (!file.startsWith(ROOT) || file.includes(`${path.sep}tests${path.sep}`) || file.includes(`${path.sep}.git`)){ res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    fs.readFile(file, (err, body) => {
      if (err){ res.writeHead(404); return res.end("Not found"); }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "max-age=600" });
      res.end(body);
    });
  });
  return new Promise(done => server.listen(port, "127.0.0.1", () => done(server)));
}
module.exports = { serve, ROOT };
if (require.main === module) serve(+process.argv[2] || 4173).then(s => console.log(`Goal Galaxy on http://127.0.0.1:${s.address().port}/`));
