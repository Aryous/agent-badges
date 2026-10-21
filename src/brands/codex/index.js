import milestones from './milestones/index.js';
import habits from './habits/index.js';
import features from './features/index.js';
import limited from './limited/index.js';

// Codex 全部徽章。一枚徽章一个文件，按系列放在各自的目录里；
// 系列目录的 index.js 写系列名和徽章顺序，陈列墙按这里的顺序分区展示。
export const SERIES = [milestones, habits, features, limited];

export default SERIES.flatMap((s) => s.badges.map((b) => ({ ...b, series: s.id })));
