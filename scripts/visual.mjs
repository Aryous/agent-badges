// 视觉回归：把所有「徽章画成图片」的输出存成 PNG，改动前后逐像素比对。
// 用法：
//   node scripts/visual.mjs capture <目录>           需要开发服务器：npx vite --port 5199
//   node scripts/visual.mjs compare <基线目录> <新目录>  有任何一个像素不同就以退出码 1 结束
// 拍什么：studio 渲染的每枚徽章（正面、斜角；分级徽章另拍最高一级）、陈列墙缩略图、主页图、落地页画廊、单枚查看翻到背面的导出图。
// 示例数据的日期跟着当天走：基线和改动后要在同一天拍。
import { chromeArgs, launchChrome } from './browser.mjs';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BRANDS } from '../src/brands/index.js';
import { normalizeProgress } from '../src/data/normalize.js';
import { DATA_SOURCES } from '../src/data/progress.js';

const BASE = 'http://localhost:5199';
const [cmd, dirA, dirB] = process.argv.slice(2);
if (!['capture', 'compare'].includes(cmd) || !dirA || (cmd === 'compare' && !dirB)) {
  console.error('用法：node scripts/visual.mjs capture <目录> | compare <基线目录> <新目录>');
  process.exit(2);
}

// 2D 画布一律用 CPU 光栅：刻字贴图是 2D 画布画的字，Chrome 对新画布走 GPU 还是 CPU 光栅
// 取决于当时页面上已有多少加速画布（随垃圾回收时机变化），两条路径的字形抗锯齿差 1 个色阶，
// 会让同一份代码拍出的背面截图偶尔不同
const browser = await launchChrome({ args: [...chromeArgs(), '--disable-accelerated-2d-canvas'] });
const save = (name, dataURL) => writeFileSync(join(dirA, `${name}.png`), Buffer.from(dataURL.split(',')[1], 'base64'));

async function open(path, ready) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.error(`页面报错 ${path}: ${e.message}`));
  await page.goto(BASE + path);
  await page.waitForFunction(ready, null, { timeout: 180000 });
  return page;
}

async function capture() {
  mkdirSync(dirA, { recursive: true });
  if (readdirSync(dirA).some((f) => f.endsWith('.png'))) {
    console.error(`目录 ${dirA} 里已有图片，先删掉或换一个空目录`);
    process.exit(2);
  }
  let n = 0;

  // studio：每枚徽章正面 + 斜角；分级徽章再拍最高一级（含顶级彩蛋外形）
  const studio = await open('/tools/studio.html', () => window.__studio?.ready);
  const jobs = [{ brand: 'logo' }];
  for (const { brand, badges } of BRANDS) {
    for (const c of badges) {
      jobs.push({ brand: brand.id, id: c.id, showcase: true });
      if (c.tiers) jobs.push({ brand: brand.id, id: c.id, tier: c.tiers.length - 1, tag: 'top' });
    }
  }
  for (const { tag = 'showcase', ...job } of jobs) {
    for (const [view, angle, tilt] of [['front', 0, 0], ['angle', 0.52, 0.2]]) {
      const url = await studio.evaluate((o) => window.__studio.render(o), { ...job, angle, tilt, size: 1024, engraving: 1024 });
      save(`studio--${job.brand}--${job.id ?? 'logo'}--${tag}--${view}`, url);
      n++;
    }
  }
  await studio.close();

  // 陈列墙缩略图（示例数据）；第一个工具的页面上再生成一张主页图
  for (const [i, { brand }] of BRANDS.entries()) {
    const wall = await open(`/?source=mock&lang=zh&brand=${brand.id}`, () => window.__badgeApp?.ready);
    const tiles = await wall.evaluate(() => [...document.querySelectorAll('.tile')].map((t) => [t.dataset.id, t.querySelector('img').src]));
    for (const [id, src] of tiles) save(`wall--${brand.id}--${id}`, src);
    n += tiles.length;
    if (i === 0) {
      await wall.evaluate(() => window.__badgeApp.openShelf());
      await wall.waitForFunction(() => window.__badgeApp.shelfURL, null, { timeout: 180000 });
      save('shelf--dark', await wall.evaluate(() => window.__badgeApp.shelfURL));
      n++;
    }
    await wall.close();
  }

  // 落地页画廊：两个标签各拍一遍
  const site = await open('/landing.html?lang=zh', () => window.__site?.ready);
  await site.locator('[data-gallery]').scrollIntoViewIfNeeded();
  for (const [i, { brand, badges }] of BRANDS.entries()) {
    if (i > 0) await site.locator('[data-gallery-tabs] button').nth(i).click();
    await site.waitForFunction((count) => document.querySelectorAll('.gallery-item.is-ready').length === count, badges.length, { timeout: 180000 });
    const items = await site.evaluate(() => [...document.querySelectorAll('.gallery-item')].map((a) => [new URL(a.href).hash.slice(1), a.querySelector('img').src]));
    for (const [id, src] of items) save(`gallery--${brand.id}--${id}`, src);
    n += items.length;
  }
  await site.close();

  // 单枚查看翻到背面：每个工具挑几种状态（分级、隐藏、未解锁、普通已解锁），中英文各一遍。
  // 示例数据里没有哪枚分级徽章到了带款式的顶级，所以顶级彩蛋另开一页：?preview=unlocked&tier= 把分级徽章都设成最高级再拍。
  // 钉在背面角度，等刻字换成 2048 的清晰版本后，用导出 PNG 的同一条路径画（单次渲染，不受超采样进度影响）
  async function shootBacks(page, ids, name) {
    for (const id of ids) {
      await page.evaluate((id) => window.__badgeApp.open(id, { award: false }), id);
      await page.evaluate(() => window.__badgeApp.hold(Math.PI));
      await page.waitForTimeout(2500);
      const { dataURL } = await page.evaluate(() => window.__badgeApp.exportPNG());
      save(name(id), dataURL);
      n++;
      await page.evaluate(() => window.__badgeApp.close());
      await page.waitForTimeout(500);
    }
  }
  const missing = (brandId, label) => {
    console.error(`${brandId} 找不到「${label}」状态的徽章，背面截图会少一种；改示例数据或这里的挑选条件`);
    process.exit(2);
  };
  for (const { brand, badges } of BRANDS) {
    const st = normalizeProgress(await DATA_SOURCES[brand.id].mock(), badges);
    const wants = {
      '分级（非顶级彩蛋）': (b) => b.tiers && st[b.id].unlocked && !b.tiers[st[b.id].tier]?.variants,
      '隐藏未解锁': (b) => b.hidden && !st[b.id].unlocked,
      '普通未解锁': (b) => !b.hidden && !b.tiers && !st[b.id].unlocked,
      '普通已解锁': (b) => !b.hidden && !b.tiers && st[b.id].unlocked,
    };
    const picks = Object.entries(wants).map(([label, test]) => badges.find(test)?.id ?? missing(brand.id, label));
    const top = badges.find((b) => b.tiers?.at(-1).variants) ?? missing(brand.id, '顶级彩蛋');
    for (const lang of ['zh', 'en']) {
      const wall = await open(`/?source=mock&lang=${lang}&brand=${brand.id}`, () => window.__badgeApp?.ready);
      await shootBacks(wall, new Set(picks), (id) => `back--${brand.id}--${id}--${lang}`);
      await wall.close();
      const preview = await open(`/?source=mock&lang=${lang}&brand=${brand.id}&preview=unlocked&tier=${top.tiers.length - 1}`, () => window.__badgeApp?.ready);
      await shootBacks(preview, [top.id], (id) => `back--${brand.id}--${id}--top--${lang}`);
      await preview.close();
    }
  }

  console.log(`${n} 张 → ${dirA}`);
}

async function compare() {
  const page = await browser.newPage();
  const names = readdirSync(dirA).filter((f) => f.endsWith('.png')).sort();
  if (names.length === 0) {
    console.log(`基线目录 ${dirA} 里没有图片`);
    return 1;
  }
  const extra = readdirSync(dirB).filter((f) => f.endsWith('.png') && !names.includes(f));
  let bad = extra.length;
  for (const f of extra) console.log(`多出 ${f}`);
  for (const name of names) {
    let B;
    try {
      B = readFileSync(join(dirB, name)).toString('base64');
    } catch {
      console.log(`缺少 ${name}`);
      bad++;
      continue;
    }
    const A = readFileSync(join(dirA, name)).toString('base64');
    if (A === B) continue;
    const r = await page.evaluate(async ([A, B]) => {
      const load = (s) => new Promise((ok, fail) => {
        const img = new Image();
        img.onload = () => ok(img);
        img.onerror = fail;
        img.src = 'data:image/png;base64,' + s;
      });
      const [ia, ib] = await Promise.all([load(A), load(B)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { size: `${ia.width}x${ia.height} → ${ib.width}x${ib.height}` };
      const px = (img) => {
        const c = new OffscreenCanvas(img.width, img.height);
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        return g.getImageData(0, 0, img.width, img.height).data;
      };
      const da = px(ia);
      const db = px(ib);
      let count = 0;
      let max = 0;
      for (let i = 0; i < da.length; i += 4) {
        let m = 0;
        for (let k = 0; k < 4; k++) m = Math.max(m, Math.abs(da[i + k] - db[i + k]));
        if (m > 0) count++;
        if (m > max) max = m;
      }
      return { count, max };
    }, [A, B]);
    if (r.size || r.count > 0) {
      bad++;
      console.log(`不同 ${name}  ${r.size ?? `${r.count} 个像素，最大差 ${r.max}`}`);
    }
  }
  console.log(bad ? `${bad}/${names.length} 张不同` : `${names.length} 张全部一致`);
  return bad;
}

const bad = cmd === 'capture' ? (await capture(), 0) : await compare();
await browser.close();
process.exit(bad ? 1 : 0);
