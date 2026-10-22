// 接收浏览器交回的陈列图 PNG（npx agent-badges shelf）。
// 只接受一次、nonce 必须匹配、只收 PNG、限制大小；文件写到哪由命令决定，页面无权指定。
import { randomBytes } from 'node:crypto';

export const SHELF_PATH = '/__agent-badges/shelf';
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * @param {object} [o]
 * @param {string[]} [o.themes]  要收齐的图（主页图有深色、浅色两张）；页面用 ?theme= 标明是哪一张，不写默认 dark
 * @returns {{ nonce: string, handle(req, res): boolean, received: Promise<{ png: Buffer, pngs: Record<string, Buffer>, respond(status: number, body: object): void }> }}
 *   handle 返回 false 表示这个请求不归它管。全部收齐后 received 才完成；
 *   前面几张立即回复 202，最后一张由命令决定怎么回复。png 是第一张（兼容只要一张的用法）。
 */
export function createReceiver({ nonce = randomBytes(16).toString('hex'), maxBytes = 20 * 1024 * 1024, themes = ['dark'] } = {}) {
  const pngs = {};
  const busy = new Set();
  let done = false;
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

    const theme = url.searchParams.get('theme') ?? themes[0];
    if (req.method !== 'POST') return reject(405, 'POST only'), true;
    if (url.searchParams.get('nonce') !== nonce) return reject(403, 'bad nonce'), true;
    if (!themes.includes(theme)) return reject(400, 'unknown theme'), true;
    if (done || pngs[theme] || busy.has(theme)) return reject(409, 'already received'), true;
    if (!/^image\/png\b/i.test(req.headers['content-type'] ?? '')) return reject(415, 'PNG only'), true;
    if (Number(req.headers['content-length'] ?? 0) > maxBytes) return reject(413, 'too large'), true;

    busy.add(theme);
    const chunks = [];
    let size = 0;
    let failed = false;
    const fail = (status, error) => {
      failed = true;
      busy.delete(theme); // 让页面可以重试
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
      busy.delete(theme);
      pngs[theme] = png;
      if (themes.every((t) => pngs[t])) {
        done = true;
        deliver({ png: pngs[themes[0]], pngs, respond: reply });
      } else reply(202, { ok: true, waiting: themes.filter((t) => !pngs[t]) });
    });
    return true;
  }

  return { nonce, handle, received };
}
