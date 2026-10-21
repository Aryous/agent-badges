// card 命令：写成就卡片 SVG。
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { t } from '../i18n.js';

/** 成就卡片：只含解锁数和几个总数，适合公开放在 GitHub 个人主页。 */
export async function writeCard(data, opts) {
  const { renderCard } = await import('../../collect/card.js');
  const { BRAND_INFO, summarize } = await import('../../collect/summary.js');
  const brands = Object.entries(data).map(([id, d]) => {
    const { brand } = BRAND_INFO[id];
    const { unlocked, total } = summarize(id, d.progress);
    return { id, name: brand.name, accent: brand.ui.accent, unlocked, total, daily: d.daily ?? {} };
  });
  if (!brands.length) throw new Error(t('没有可用的数据，无法生成卡片', 'No data found, so there is nothing to put on the card'));
  const file = resolve(opts.out ?? 'agent-badges-card.svg');
  writeFileSync(file, renderCard({ brands, name: opts.name, theme: opts.theme, lang: opts.cardLang }));
  console.log(t(`\n成就卡片：${file}`, `\nCard saved to ${file}`));
  console.log(t('放进 GitHub 个人主页 README：![Agent Badges](./agent-badges-card.svg)', 'Add it to your profile README: ![Agent Badges](./agent-badges-card.svg)'));
}
