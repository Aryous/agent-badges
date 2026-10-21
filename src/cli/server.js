// 打开浏览器和本地页面服务。
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

export function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
}

/** 本地页面。handle 可以接管额外的请求（陈列图回传），返回 true 表示已处理。 */
export function serve(html, port, { handle = null, tries = 10 } = {}) {
  return new Promise((resolvePromise, reject) => {
    const server = createServer((req, res) => {
      if (handle?.(req, res)) return;
      if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/?'))) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end(html);
      } else {
        res.writeHead(404).end();
      }
    });
    server.once('error', (e) => {
      if (e.code === 'EADDRINUSE' && tries > 0) resolvePromise(serve(html, port + 1, { handle, tries: tries - 1 }));
      else reject(e);
    });
    // 只监听本机回环地址，局域网里的其他设备访问不到
    server.listen(port, '127.0.0.1', () => resolvePromise({ server, port }));
  });
}
