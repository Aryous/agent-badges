import { calendar } from '../../shared/parts.js';
import { medal } from '../medal.js';

// 全勤月：尖顶六边形，圆盘上一页日历，工作日全部打勾

const perfectMonth = {
  id: 'perfect-month',
  title: '全勤月',
  titleEn: 'PERFECT MONTH',
  description: '一个月里每个工作日都和 Claude Code 见了面。日历上一格不落，全是勾。',
  en: { title: 'Perfect Month', description: 'Met Claude Code on every weekday of a month. Not a single box left unticked.' },
  criteria: { metric: 'days.perfectMonth', target: 22 },
  ...medal({
    bottom: 'PERFECT MONTH',
    shape: { type: 'polygon', sides: 6, radius: 1.08, cornerRadius: 0.16, rotation: Math.PI / 2, depth: 0.22, bevel: 0.045 },
    metal: 'gold',
    band: 'forest',
    disc: 'lime',
    art: [
      ...calendar(),
    ],
  }),
};

export default perfectMonth;
