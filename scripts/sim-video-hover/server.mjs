import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
const dir = path.dirname(new URL(import.meta.url).pathname)
const TTFB = Number(process.env.TTFB ?? 40)
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  const name = url.pathname.slice(1)
  setTimeout(() => {
    if (name === '' || name === 'index.html') {
      res.writeHead(200, {'content-type': 'text/html'}); res.end(fs.readFileSync(path.join(dir,'index.html'))); return
    }
    const file = path.join(dir, path.basename(name))
    if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return }
    const size = fs.statSync(file).size
    const range = req.headers.range
    const headers = {'content-type': 'video/webm', 'accept-ranges': 'bytes', 'cache-control': 'no-store'}
    if (range) {
      const m = /bytes=(\d+)-(\d*)/.exec(range)
      const start = Number(m[1]); const end = m[2] ? Number(m[2]) : size - 1
      res.writeHead(206, {...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1})
      fs.createReadStream(file, {start, end}).pipe(res)
    } else {
      res.writeHead(200, {...headers, 'content-length': size})
      fs.createReadStream(file).pipe(res)
    }
  }, name.endsWith('.webm') ? TTFB : 0)
}).listen(Number(process.env.PORT ?? 8099))
