// GitHub 主页徽章陈列图的纯逻辑：放哪些徽章、文字怎么写、每样东西画在哪。
// 不依赖 three 和 DOM，Node 里也能测试；真正的绘制在 viewer/shelf.js。
import { badgeTitle, tierLabel } from '../brands/shared/text.js';

/**
 * 决定陈列哪些工具、哪些徽章。
 * 有本机数据时只放有本机数据的工具（不能混进示例数据）；都没有时（在线演示）全部用示例数据。
 * 只放已解锁的徽章，按目录顺序；一枚都没解锁的工具不放。
 * @param {{ brand, badges, progress, local: boolean }[]} entries
 * @returns {{ brand, items: { config, state }[] }[]}
 */
export function pickShelf(entries) {
  const anyLocal = entries.some((e) => e.local);
  return entries
    .filter((e) => !anyLocal || e.local)
    .map((e) => ({
      brand: e.brand,
      items: e.badges.filter((c) => e.progress[c.id]?.unlocked).map((config) => ({ config, state: e.progress[config.id] })),
    }))
    .filter((g) => g.items.length);
}

/** 徽章下面的两行字：名字，以及分级徽章的等级。不写日期和用量。 */
export function shelfLabel(config, state, lang) {
  const title = badgeTitle(config, lang, state.tier);
  const shiny = state.shiny ? (lang === 'zh' ? '闪光' : 'Shiny') : '';
  if (!config.tiers || state.tier == null) return { title, meta: shiny };
  const tier = config.tiers[state.tier];
  // 英文名字里已经带着数值（100 Sessions），只写等级；中文名字不带数值，补上
  const name = tierLabel(tier, state.variant, lang);
  const meta = [shiny, lang === 'zh' ? `${name} · ${tier.label}` : name].filter(Boolean).join(' · ');
  return { title, meta };
}

/** 组标题右侧：只写已解锁数量，不写总数（以后会加新徽章）。 */
export const shelfCount = (n, lang) => (lang === 'zh' ? `已解锁 ${n} 枚` : `${n} unlocked`);

export const SHELF = {
  width: 840, // 显示宽度；输出按 scale 放大
  scale: 2,
  cols: 6,
  badge: 104, // 徽章显示尺寸
  head: 52, // 组标题高度（含下方分隔线和留白）
  row: 172, // 行距：一行徽章的顶部到下一行顶部
  cellH: 150, // 一格实际占用的高度：徽章 + 两行字
  gap: 28, // 组与组之间
  pad: 8,
};

/**
 * 排版：每组一个标题，下面按 cols 列排徽章。
 * @returns {{ width, height, groups: { brand, y, items: { config, state, x, y }[] }[] }}
 */
export function shelfLayout(groups, L = SHELF) {
  const cell = (L.width - L.pad * 2) / L.cols;
  let y = L.pad;
  const out = groups.map((g, gi) => {
    if (gi) y += L.gap;
    const head = y;
    y += L.head;
    const items = g.items.map((it, i) => ({
      ...it,
      x: L.pad + (i % L.cols) * cell + (cell - L.badge) / 2,
      y: y + Math.floor(i / L.cols) * L.row,
    }));
    y += (Math.ceil(g.items.length / L.cols) - 1) * L.row + L.cellH;
    return { brand: g.brand, y: head, items };
  });
  return { width: L.width, height: Math.ceil(y + L.pad), cell, groups: out };
}
