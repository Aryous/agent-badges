// 界面文字：中文 / 英文。语言取 ?lang=zh|en，否则跟随浏览器。
const pick = () => {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lang') : null;
  if (q === 'zh' || q === 'en') return q;
  return typeof navigator !== 'undefined' && /^zh/i.test(navigator.language) ? 'zh' : 'en';
};

export const lang = pick();

const STRINGS = {
  zh: {
    'app.sub': '成就徽章',
    'app.title': '{brand} 成就徽章',
    'nav.brands': '切换工具',
    'app.noWebGL': '当前浏览器不支持 WebGL，无法显示 3D 徽章。',
    'app.loadFailed': '加载失败：{msg}',
    'app.progressFailed': '进度数据加载失败，徽章暂按未解锁展示。',
    'source.local': '本机数据 · 更新于 {m} 月 {d} 日 {time}',
    'source.mock': '示例数据',
    'source.getYours': '生成你自己的 →',
    'source.mockHint': '运行 npx agent-badges 查看你自己的徽章',
    'state.hidden': '隐藏成就',
    'state.earned': '已获得',
    'state.locked': '未解锁',
    'tile.aria': '{title}，{state}，查看详情',
    'inspect.back': '全部徽章',
    'inspect.backAria': '返回陈列墙',
    'inspect.stage': '3D 徽章，可拖动旋转',
    'inspect.replay': '重播动画',
    'inspect.hint': '左右拖动旋转 · 翻到背面看刻字',
    'inspect.hiddenDesc': '这是一枚隐藏成就。继续探索 {brand}，它会在某个时刻揭晓。',
    'inspect.toNext': ' 距下一级',
    'export.open': '导出图片',
    'export.bg': '背景',
    'export.bgAria': '导出背景',
    'export.transparent': '透明',
    'export.ink': '墨色',
    'export.face': '朝向',
    'export.front': '正面',
    'export.back': '背面',
    'export.size': '尺寸',
    'export.download': '下载 PNG',
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
    'profile.shelf': 'GitHub 主页图',
    'shelf.title': 'GitHub 主页徽章图',
    'shelf.making': '正在渲染徽章 {done} / {total}…',
    'shelf.empty': '还没有解锁的徽章。',
    'shelf.hint': '透明背景，GitHub 深浅主题都能看清。下载后放进个人主页仓库，在 README 里引用；也可以运行 npx agent-badges shelf 自动生成。',
    'shelf.sending': '正在交给命令行保存…',
    'shelf.saved': '已保存到 {file}，可以关闭这个页面了。',
    'shelf.failed': '没能交给命令行（{msg}），可以点「下载 PNG」手动保存。',
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
    'app.sub': 'Achievements',
    'app.title': '{brand} Achievements',
    'nav.brands': 'Switch tool',
    'app.noWebGL': 'This browser does not support WebGL, so the 3D badges cannot be shown.',
    'app.loadFailed': 'Failed to load: {msg}',
    'app.progressFailed': 'Could not load progress data. Badges are shown as locked for now.',
    'source.local': 'Local data · updated {date} {time}',
    'source.mock': 'Sample data',
    'source.getYours': 'Get yours →',
    'source.mockHint': 'Run npx agent-badges to see your own badges',
    'state.hidden': 'Hidden achievement',
    'state.earned': 'Earned',
    'state.locked': 'Locked',
    'tile.aria': '{title}, {state}, view details',
    'inspect.back': 'All badges',
    'inspect.backAria': 'Back to the badge wall',
    'inspect.stage': '3D badge, drag to rotate',
    'inspect.replay': 'Replay',
    'inspect.hint': 'Drag to rotate · flip it over to read the engraving',
    'inspect.hiddenDesc': 'This is a hidden achievement. Keep exploring {brand} and it will reveal itself.',
    'inspect.toNext': ' to next tier',
    'export.open': 'Export image',
    'export.bg': 'Background',
    'export.bgAria': 'Export background',
    'export.transparent': 'Transparent',
    'export.ink': 'Ink',
    'export.face': 'Side',
    'export.front': 'Front',
    'export.back': 'Back',
    'export.size': 'Size',
    'export.download': 'Download PNG',
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
    'profile.shelf': 'GitHub profile image',
    'shelf.title': 'Badges for your GitHub profile',
    'shelf.making': 'Rendering badges {done} / {total}…',
    'shelf.empty': 'No badges unlocked yet.',
    'shelf.hint': 'Transparent, so it reads on GitHub light and dark themes. Put it in your profile repo and reference it from the README, or run npx agent-badges shelf to do it from the terminal.',
    'shelf.sending': 'Handing it to the terminal…',
    'shelf.saved': 'Saved to {file}. You can close this page.',
    'shelf.failed': 'Couldn\'t hand it to the terminal ({msg}). Use Download PNG instead.',
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

/** 其他页面（如落地页）追加自己的文字。 */
export function addStrings(dict) {
  for (const l of Object.keys(dict)) Object.assign(STRINGS[l], dict[l]);
}

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

/** 给页面里带 data-i18n / data-i18n-aria 的元素填上文字。 */
export function applyStatic(root = document) {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
}
