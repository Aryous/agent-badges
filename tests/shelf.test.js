// GitHub 主页徽章陈列图：挑哪些徽章、文字、排版，以及命令行接收图片的规则。
import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { parseArgs } from '../bin/agent-badges.mjs';
import { BRAND_INFO } from '../src/collect/summary.js';
import { normalizeProgress } from '../src/data/normalize.js';
import { SHELF, pickShelf, shelfCount, shelfLabel, shelfLayout } from '../src/data/shelf.js';
import { SHELF_PATH, createReceiver } from '../src/collect/receive.js';

const { brand: cc, badges: ccBadges } = BRAND_INFO['claude-code'];
const { brand: cx, badges: cxBadges } = BRAND_INFO.codex;
const tiered = ccBadges.find((b) => b.tiers);
const plain = ccBadges.find((b) => !b.tiers && !b.hidden);
const hidden = ccBadges.find((b) => b.hidden);

const progressOf = (badges, raw) => normalizeProgress(raw, badges);
const ccProgress = progressOf(ccBadges, {
  [plain.id]: { unlocked: true, earnedAt: '2026-05-02', progress: { current: 1, target: 1 } },
  [tiered.id]: { value: tiered.tiers[2].threshold, earnedAt: '2026-06-01' },
  [hidden.id]: { unlocked: true, earnedAt: '2026-07-01', progress: { current: 1, target: 1 } },
});

describe('陈列图：挑选徽章', () => {
  it('只放已解锁的，按目录顺序', () => {
    const [group] = pickShelf([{ brand: cc, badges: ccBadges, progress: ccProgress, local: true }]);
    const ids = group.items.map((it) => it.config.id);
    expect(ids).toEqual(ccBadges.filter((b) => [plain.id, tiered.id, hidden.id].includes(b.id)).map((b) => b.id));
    expect(group.items.every((it) => it.state.unlocked)).toBe(true);
  });

  it('有本机数据时不混入示例数据；一枚没解锁的工具不放', () => {
    const none = progressOf(cxBadges, {});
    const mock = { brand: cx, badges: cxBadges, progress: progressOf(cxBadges, { [cxBadges[0].id]: { unlocked: true, progress: { current: 1, target: 1 } } }), local: false };
    expect(pickShelf([{ brand: cc, badges: ccBadges, progress: ccProgress, local: true }, mock]).map((g) => g.brand.id)).toEqual(['claude-code']);
    expect(pickShelf([{ brand: cc, badges: ccBadges, progress: ccProgress, local: true }, { brand: cx, badges: cxBadges, progress: none, local: true }]).map((g) => g.brand.id)).toEqual(['claude-code']);
    // 都没有本机数据（在线演示）：用示例数据
    expect(pickShelf([mock]).map((g) => g.brand.id)).toEqual(['codex']);
  });
});

describe('陈列图：文字', () => {
  it('分级徽章写等级，普通徽章只写名字（不写日期）', () => {
    expect(shelfLabel(tiered, ccProgress[tiered.id], 'en').meta).toMatch(/^(Bronze|Silver|Gold|Platinum)$/);
    expect(shelfLabel(tiered, ccProgress[tiered.id], 'zh').meta).toContain(tiered.tiers[2].label);
    expect(shelfLabel(plain, ccProgress[plain.id], 'en')).toEqual({ title: expect.any(String), meta: '' });
    expect(JSON.stringify(shelfLabel(plain, ccProgress[plain.id], 'zh'))).not.toContain('2026');
  });

  it('组标题只写已解锁数量，不写总数', () => {
    expect(shelfCount(15, 'zh')).toBe('已解锁 15 枚');
    expect(shelfCount(15, 'en')).toBe('15 unlocked');
  });
});

describe('陈列图：排版', () => {
  const group = (n) => ({ brand: cc, items: Array.from({ length: n }, (_, i) => ({ config: { id: `b${i}` }, state: {} })) });

  it('每行 6 枚，不超出画面', () => {
    const L = shelfLayout([group(7), group(2)]);
    const [a, b] = L.groups;
    expect(a.items[6].y).toBeGreaterThan(a.items[5].y);
    expect(a.items[6].x).toBe(a.items[0].x);
    expect(b.y).toBeGreaterThan(a.items[6].y + SHELF.badge);
    for (const g of L.groups) {
      for (const it of g.items) {
        expect(it.x).toBeGreaterThanOrEqual(0);
        expect(it.x + SHELF.badge).toBeLessThanOrEqual(L.width);
        expect(it.y + SHELF.cellH).toBeLessThanOrEqual(L.height);
      }
    }
  });

  it('高度随行数增长', () => {
    expect(shelfLayout([group(6)]).height).toBeLessThan(shelfLayout([group(7)]).height);
  });
});

describe('陈列图：命令行接收图片', () => {
  const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
  let server;
  afterEach(() => server?.close());

  async function start(opts) {
    const receiver = createReceiver(opts);
    server = createServer((req, res) => receiver.handle(req, res) || res.writeHead(404).end());
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${server.address().port}${SHELF_PATH}`;
    const post = (body, { nonce = receiver.nonce, type = 'image/png' } = {}) =>
      fetch(`${base}?nonce=${nonce}`, { method: 'POST', headers: { 'content-type': type }, body });
    return { receiver, post, base };
  }

  it('参数解析', () => {
    expect(parseArgs(['shelf', '--out', 'x.png', '--lang', 'zh'])).toMatchObject({ command: 'shelf', out: 'x.png', cardLang: 'zh' });
  });

  it('拒绝：GET、nonce 不对、不是 PNG、太大', async () => {
    const { post, base } = await start({ maxBytes: 1024 });
    expect((await fetch(base)).status).toBe(405);
    expect((await post(PNG, { nonce: 'wrong' })).status).toBe(403);
    expect((await post('hello', { type: 'text/plain' })).status).toBe(415);
    expect((await post(Buffer.alloc(40, 1))).status).toBe(400); // 声称是 PNG，内容不是
    expect((await post(Buffer.concat([PNG, Buffer.alloc(2048)]))).status).toBe(413);
  });

  it('收到 PNG 后由命令回复，只收一次', async () => {
    const { receiver, post } = await start();
    const first = post(PNG);
    const { png, respond } = await receiver.received;
    expect(png.equals(PNG)).toBe(true);
    respond(200, { ok: true, file: '/tmp/x.png' });
    const res = await first;
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, file: '/tmp/x.png' });
    expect((await post(PNG)).status).toBe(409);
  });

  it('深浅两张：前一张先回 202，收齐后由命令回复', async () => {
    const { receiver, base } = await start({ themes: ['dark', 'light'] });
    const post = (theme) => fetch(`${base}?nonce=${receiver.nonce}&theme=${theme}`, { method: 'POST', headers: { 'content-type': 'image/png' }, body: PNG });
    expect((await fetch(`${base}?nonce=${receiver.nonce}&theme=sepia`, { method: 'POST', headers: { 'content-type': 'image/png' }, body: PNG })).status).toBe(400);
    expect((await post('light')).status).toBe(202);
    expect((await post('light')).status).toBe(409);
    const last = post('dark');
    const { pngs, respond } = await receiver.received;
    expect(Object.keys(pngs).sort()).toEqual(['dark', 'light']);
    respond(200, { ok: true });
    expect((await last).status).toBe(200);
  });

  it('不归它管的路径交还给页面服务', async () => {
    const { base } = await start();
    expect((await fetch(base.replace(SHELF_PATH, '/'))).status).toBe(404);
  });
});
