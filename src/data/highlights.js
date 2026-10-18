// 档案摘要：最近获得、即将解锁。页面、CLI 和 Skill 共用同一套口径。

/**
 * @param {object[]} badges  徽章配置
 * @param {object}   p       归一化后的进度（normalizeProgress 的结果）
 * @returns {{ unlocked: object[], recent: object[], nearMiss: object[] }}
 *   recent / nearMiss 的每一项是 { badge, state, ratio? }
 */
export function highlights(badges, p, n = 3) {
  const unlocked = badges.filter((b) => p[b.id]?.unlocked);
  const recent = unlocked
    .filter((b) => p[b.id].earnedAt)
    .sort((a, b) => p[b.id].earnedAt.localeCompare(p[a.id].earnedAt))
    .slice(0, n)
    .map((b) => ({ badge: b, state: p[b.id] }));
  // 即将解锁：未解锁或未满级的徽章里，进度比例最高的几枚（隐藏成就不透露）
  const nearMiss = badges
    .filter((b) => p[b.id] && !(b.hidden && !p[b.id].unlocked))
    .map((b) => {
      const s = p[b.id];
      const maxed = b.tiers ? s.tier === b.tiers.length - 1 : s.unlocked;
      const ratio = s.progress.target ? s.progress.current / s.progress.target : 0;
      return { badge: b, state: s, maxed, ratio };
    })
    .filter((x) => !x.maxed && x.ratio > 0 && x.ratio < 1)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, n)
    .map(({ badge, state, ratio }) => ({ badge, state, ratio }));
  return { unlocked, recent, nearMiss };
}
