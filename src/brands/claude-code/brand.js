// Claude Code 品牌主题。徽章配置里的 color 字段引用这里的键名。

export default {
  id: 'claude-code',
  name: 'Claude Code',
  // 鲜明多彩：每枚徽章一组主色（深色环带 + 亮色圆盘），金属轮换；
  // Claude Code 橙只留给小怪物，是全套唯一的橙色。
  palette: {
    background: '#141413', // 页面墨色
    primary: '#D97757', // Claude Code 橙（小怪物）
    ivory: '#F3F0E8',
    ink: '#1B1A19', // 小怪物的眼睛
    cobalt: '#1D3C8F',
    azure: '#3D7BEA',
    emerald: '#0F6A4C',
    mint: '#2FB47F',
    violet: '#462584',
    lilac: '#8F6BE6',
    gold: '#D9B061',
    silver: '#C9CED6',
    rose: '#E0A68F',
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
