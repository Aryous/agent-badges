import { disposeBadge } from '../engine/badge.js';
import { createBadgeRenderer } from '../viewer/badge-renderer.js';
import { mountBadge } from '../viewer/mount-badge.js';
import { forEachFrame } from '../viewer/frame.js';
import { CASE, MEDAL_FILL } from '../viewer/proof-set.js';
import { gemKey, medalPalette, monthMedalConfig } from '../viewer/month-medal.js';

// 年度铸币套装的月章：画托盘里的 3D 图片，点开时组装一枚交给单枚查看。
// 截图借陈列墙缩略图的那个舞台（整页仍只有一个 WebGL 上下文），一帧画一枚，单枚查看打开时暂停。
// 什么时候开始画：陈列墙缩略图画完、浏览器空闲后（start），或者用户先拉开了抽屉（hurry）。
// 结果按「年份 | 工具」缓存在内存里；画不出来（拿不到 WebGL 等）就返回 null，托盘一直用 SVG。

const STATE = { unlocked: true, earnedAt: null, tier: null, progress: { current: 1, target: 1 } };
const LIFT_MS = 190; // 托盘里原位抬起的时长，和 CSS 的 .is-lifting 一致

/** 单枚查看信息区的数据：图例只列当月用过的工具，用宝石色（和珠子一致）。 */
export function medalInfo(data, tier, series, palette) {
  const color = (i) => palette[gemKey(i, 4)];
  const legend = data.tools.map((i) => ({ name: series[i].name, color: color(i) }));
  return {
    year: data.year,
    month: data.month,
    tier,
    tokens: data.tokens,
    active: data.active,
    unlocks: data.unlocks,
    legend,
    both: data.tools.length > 1 ? [color(data.tools[0]), color(data.tools[1])] : null,
  };
}

/**
 * @param {object} ctx
 * @param {{ series: { id: string, name: string, color: string }[], start: Promise<void>, pause: () => Promise<void> }} opts
 */
export function createMedals(ctx, { series, start, pause }) {
  const brand = { ...ctx.brand, palette: { ...ctx.brand.palette, ...medalPalette(series) } };
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const cache = new Map();
  let renderer = null;
  let hurry;
  const gate = Promise.race([start, new Promise((resolve) => (hurry = resolve))]);

  const mount = (data, tier) => {
    const config = monthMedalConfig(data, { tier });
    return { config, ...mountBadge(config, brand, STATE, { stage: ctx.stage, lang: ctx.lang, engraving: 0 }) };
  };

  /** 12 枚（或更少）月章的图片地址，顺序和 medals 一样。 */
  function request(key, medals) {
    if (!cache.has(key)) {
      const job = gate
        .then(async () => {
          renderer ??= createBadgeRenderer(ctx.stage);
          const size = Math.round(CASE.coinMax * Math.min(2, window.devicePixelRatio || 1));
          const urls = [];
          await forEachFrame(
            medals,
            (md) => {
              const shot = mount(md.data, md.tier);
              try {
                urls.push(renderer.snapshot(shot, { size, fill: MEDAL_FILL }));
              } finally {
                disposeBadge(shot.badge);
              }
            },
            { pause },
          );
          return urls;
        })
        .catch((err) => {
          console.warn('月章 3D 图片画不出来，继续用 SVG', err);
          cache.delete(key); // 下次切回来再试
          return null;
        });
      cache.set(key, job);
    }
    return cache.get(key);
  }

  // 抬起途中再点（双击、点另一枚）不算：一次只打开一枚
  let opening = false;
  const drawerOpen = (slot) => !!slot.closest('.proof')?.classList.contains('is-open');

  /** 点开一枚：组装好交给单枚查看；托盘显示的是 3D 图片时先原位抬起，再从这个位置飞出去。 */
  async function open({ slot, medal, viaKeyboard, art }) {
    if (opening) return;
    opening = true;
    try {
      const fly = art && !reduced();
      if (fly) {
        slot.classList.add('is-lifting');
        await new Promise((r) => setTimeout(r, LIFT_MS));
        // 抬起途中托盘重画了、或者抽屉关上了：不打开
        if (!slot.isConnected || !drawerOpen(slot)) return;
      }
      // 从这里到交出去都是同步的：量好抬起时的位置 → 放下 → 组装 → 交给单枚查看
      const img = slot.querySelector('.proof-art img');
      const from = fly && img ? img.getBoundingClientRect() : null;
      slot.classList.remove('is-lifting');
      const item = {
        kind: 'medal',
        ...mount(medal.data, medal.tier),
        state: STATE,
        award: false,
        tile: slot,
        fill: MEDAL_FILL,
        info: medalInfo(medal.data, medal.tier, series, brand.palette),
        /** 飞出去时托盘里留空凹槽，落回来再显示 */
        away: (on) => slot.classList.toggle('is-out', on),
        /** 飞回的落点：托盘里那张图片的位置；看不到（滑出了托盘、礼盒关上、不在屏幕里）就不飞回 */
        home() {
          const pic = slot.querySelector('.proof-art img');
          if (!fly || !pic || !slot.isConnected || !drawerOpen(slot)) return null;
          const r = pic.getBoundingClientRect();
          const tray = slot.closest('.proof-tray')?.getBoundingClientRect();
          const inTray = tray && r.left >= tray.left - 1 && r.right <= tray.right + 1;
          const onScreen = r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
          return inTray && onScreen ? r : null;
        },
        dispose() {
          disposeBadge(item.badge);
        },
      };
      ctx.emit('open', item, { viaKeyboard, from });
    } catch (err) {
      // 比如 WebGL 上下文丢了，组装失败：留在托盘里，不抛出去
      console.warn('月章打不开', err);
    } finally {
      slot.classList.remove('is-lifting');
      opening = false;
    }
  }

  return { request, hurry: () => hurry(), open };
}
