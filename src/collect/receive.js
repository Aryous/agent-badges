// 接收浏览器交回的陈列图 PNG（npx agent-badges shelf）。
// 只接受一次、nonce 必须匹配、只收 PNG、限制大小；文件写到哪由命令决定，页面无权指定。
import { randomBytes } from 'node:crypto';

export const SHELF_PATH = '/__agent-badges/shelf';
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * @returns {{ nonce: string, handle(req, res): boolean, received: Promise<{ png: Buffer, respond(status: number, body: object): void }> }}
 *   handle 返回 false 表示这个请求不归它管。
 */
export function createReceiver({ nonce = randomBytes(16).toString('hex'), maxBytes = 20 * 1024 * 1024 } = {}) {
  let taken = false;
  let deliver;
  const received = new Promise((r) => (deliver = r));

  function handle(req, res) {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname !== SHELF_PATH) return false;
    const reply = (status, body) => {
      if (res.headersSent) return;
      res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify(body));
    };
    const reject = (status, error) => {
      reply(status, { error });
      req.resume(); // 丢掉没读的请求体
    };

    if (req.method !== 'POST') return reject(405, 'POST only'), true;
    if (url.searchParams.get('nonce') !== nonce) return reject(403, 'bad nonce'), true;
    if (taken) return reject(409, 'already received'), true;
    if (!/^image\/png\b/i.test(req.headers['content-type'] ?? '')) return reject(415, 'PNG only'), true;
    if (Number(req.headers['content-length'] ?? 0) > maxBytes) return reject(413, 'too large'), true;

    taken = true;
    const chunks = [];
    let size = 0;
    let failed = false;
    const fail = (status, error) => {
      failed = true;
      taken = false; // 让页面可以重试
      reject(status, error);
    };
    req.on('data', (c) => {
      if (failed) return;
      size += c.length;
      if (size > maxBytes) fail(413, 'too large');
      else chunks.push(c);
    });
    req.on('end', () => {
      if (failed) return;
      const png = Buffer.concat(chunks);
      if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) return fail(400, 'not a PNG');
      deliver({ png, respond: reply });
    });
    return true;
  }

  return { nonce, handle, received };
}
