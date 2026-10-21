/**
 * 设计预览：?preview=unlocked / locked 临时覆盖全部状态；
 * 分级徽章可再加 &tier=<等级下标，0 起> 预览某一级（默认最高级）。直接改写 progress。
 * @param {object[]} configs
 * @param {object} progress  徽章 id → 进度
 * @param {{ preview: string | null, tier?: number }} opts  tier 不给时取最高级
 */
export function applyPreview(configs, progress, { preview, tier }) {
  if (preview !== 'unlocked' && preview !== 'locked') return;
  const today = new Date().toISOString().slice(0, 10);
  for (const c of configs) {
    const p = progress[c.id];
    p.unlocked = preview === 'unlocked';
    p.earnedAt = p.unlocked ? p.earnedAt ?? today : null;
    if (c.tiers) {
      const want = tier ?? c.tiers.length - 1;
      const idx = Math.min(Math.max(want, 0), c.tiers.length - 1);
      p.tier = p.unlocked ? idx : null;
      p.value = p.unlocked ? c.tiers[idx].threshold : Math.floor(c.tiers[0].threshold / 2);
      const next = c.tiers[Math.min(idx + 1, c.tiers.length - 1)];
      p.progress = { current: p.value, target: p.unlocked ? next.threshold : c.tiers[0].threshold };
    } else {
      p.progress.current = p.unlocked ? p.progress.target : Math.min(p.progress.current, p.progress.target - 1);
    }
  }
}
