// Claude Code 品牌主题。徽章配置里的 color 字段引用这里的键名。

export default {
  id: 'claude-code',
  name: 'Claude Code',
  palette: {
    background: '#141413', // 暖墨色
    primary: '#D97757', // 陶土橙
    ivory: '#F0EEE6',
    gold: '#C9A36A', // 暖金
    champagne: '#E4D3B4', // 浅香槟金
    copper: '#C27A55',
    graphite: '#3A3936', // 未解锁剪影
  },
  ui: {
    accent: '#D97757',
    text: '#F0EEE6',
    muted: '#8F8B82',
  },
  engraving: {
    fontFamily: '"PingFang SC", "Hiragino Sans GB", "Helvetica Neue", sans-serif',
    lines: ({ brandName, title, titleEn, earnedAt, unlocked, progress }) => [
      brandName.toUpperCase(),
      title,
      titleEn,
      unlocked ? earnedAt : `未解锁 · ${progress.current} / ${progress.target}`,
    ],
  },
};
