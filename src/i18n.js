// 界面文字：中文 / 英文。语言取 ?lang=zh|en，否则跟随浏览器。
const pick = () => {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lang') : null;
  if (q === 'zh' || q === 'en') return q;
  return typeof navigator !== 'undefined' && /^zh/i.test(navigator.language) ? 'zh' : 'en';
};

export const lang = pick();

const STRINGS = {
  zh: {
    'profile.unlocked': '已解锁徽章',
    'profile.tokens': '累计 Token',
    'profile.activeDays': '活跃天数',
    'profile.streak': '最长连续',
    'profile.days': '{n} 天',
    'profile.recent': '最近获得',
    'profile.next': '即将解锁',
    'profile.noneRecent': '还没有获得徽章，开始使用吧。',
    'profile.noneNext': '暂时没有接近解锁的徽章。',
    'profile.share': '生成分享海报',
    'heat.title': '年度热力图',
    'heat.sub': '每天的 Token 用量',
    'heat.less': '少',
    'heat.more': '多',
    'heat.unlock': '解锁徽章',
    'heat.none': '没有记录',
    'heat.turns': '{n} 轮对话',
    'heat.summary': '{tokens} Token · {days} 个活跃日 · 最长连续 {streak} 天',
    'heat.label': '{year} 年使用热力图：{summary}',
    'heat.toggle': '在热力图中显示 {name}',
    'filter.label': '筛选徽章',
    'filter.all': '全部',
    'filter.unlocked': '已获得',
    'filter.locked': '未解锁',
    'filter.empty': '这里还没有徽章。',
    'wall.title': '全部徽章',
    'poster.title': '分享海报',
    'poster.download': '下载 PNG',
    'poster.close': '关闭',
    'poster.making': '正在生成…',
    'poster.unlocked': '已解锁',
    'poster.badges': '{n} / {total} 枚徽章',
    'poster.footer': '用 npx agent-badges 生成你的徽章墙',
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  },
  en: {
    'profile.unlocked': 'badges unlocked',
    'profile.tokens': 'Tokens',
    'profile.activeDays': 'Active days',
    'profile.streak': 'Longest streak',
    'profile.days': '{n} days',
    'profile.recent': 'Recently earned',
    'profile.next': 'Almost there',
    'profile.noneRecent': 'No badges yet. Go build something.',
    'profile.noneNext': 'Nothing close to unlocking right now.',
    'profile.share': 'Share poster',
    'heat.title': 'Activity',
    'heat.sub': 'Tokens per day',
    'heat.less': 'Less',
    'heat.more': 'More',
    'heat.unlock': 'Unlocked',
    'heat.none': 'No activity',
    'heat.turns': '{n} turns',
    'heat.summary': '{tokens} tokens · {days} active days · longest streak {streak} days',
    'heat.label': 'Activity in {year}: {summary}',
    'heat.toggle': 'Show {name} in the heatmap',
    'filter.label': 'Filter badges',
    'filter.all': 'All',
    'filter.unlocked': 'Earned',
    'filter.locked': 'Locked',
    'filter.empty': 'No badges here yet.',
    'wall.title': 'All badges',
    'poster.title': 'Share poster',
    'poster.download': 'Download PNG',
    'poster.close': 'Close',
    'poster.making': 'Rendering…',
    'poster.unlocked': 'unlocked',
    'poster.badges': '{n} / {total} badges',
    'poster.footer': 'Make your own with npx agent-badges',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
};

/** t('heat.turns', { n: 3 }) → "3 轮对话" */
export function t(key, vars = {}, l = lang) {
  const s = STRINGS[l][key] ?? STRINGS.zh[key] ?? key;
  return typeof s === 'string' ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : s;
}

/** 大数字：中文用万 / 亿，英文用 K / M / B。 */
export function formatBig(n, l = lang) {
  if (l === 'zh') {
    if (n >= 1e8) return `${+(n / 1e8).toFixed(n >= 1e9 ? 0 : 1)} 亿`;
    if (n >= 1e4) return `${+(n / 1e4).toFixed(n >= 1e5 ? 0 : 1)} 万`;
    return n.toLocaleString('zh-CN');
  }
  if (n >= 1e9) return `${+(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(1)}M`;
  if (n >= 1e4) return `${+(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

/** 2026-05-02 → 「2026 年 5 月 2 日 周六」/「Sat, May 2, 2026」 */
export function formatDay(date, l = lang) {
  const d = new Date(`${date}T00:00:00`);
  if (l === 'zh') return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 周${STRINGS.zh.weekdays[d.getDay()]}`;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
