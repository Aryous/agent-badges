import milestones from './series/milestones.js';
import habits from './series/habits.js';
import features from './series/features.js';
import limited from './series/limited.js';
import EN from './en.js';

// Claude Code 全部徽章，按系列分组。陈列墙按这里的顺序分区展示。

export const SERIES = [
  { id: 'milestones', title: '里程碑', subtitle: '起步与累计', badges: milestones },
  { id: 'habits', title: '连续与习惯', subtitle: '坚持与节奏', badges: habits },
  { id: 'features', title: '功能探索', subtitle: '解锁每一种能力', badges: features },
  { id: 'limited', title: '限定与彩蛋', subtitle: '特别的日子，隐藏的惊喜', badges: limited },
];

for (const s of SERIES) s.en = EN.series[s.id];

// 英文文字挂在 config.en 上（见 shared/text.js）
export default SERIES.flatMap((s) => s.badges.map((b) => ({ ...b, en: EN.badges[b.id], series: s.id })));
