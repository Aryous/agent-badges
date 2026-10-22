import { calendar } from '../../shared/parts.js';
import { medal } from '../medal.js';

// 全勤月：八瓣花（印章），一页日历全部打勾

const perfectMonth = {
  id: 'perfect-month',
  title: '全勤月',
  description: '一个月里每个工作日都打开过 Codex。日历一格不落，盖个全勤章。',
  en: { title: 'Perfect Month', description: 'Opened Codex on every weekday of a month. Not a box left empty: stamped for perfect attendance.' },
  criteria: { target: 22, dynamic: true },
  ...medal({
    bottom: 'PERFECT MONTH',
    shape: { type: 'flower', petals: 8, radius: 1.07, petal: 0.3, valley: 0.08, depth: 0.22, bevel: 0.04 },
    metal: 'rose',
    band: 'cobalt',
    disc: 'periwinkle',
    art: [...calendar({ header: 'electric', ticks: 'electric', binder: 'rose' })],
  }),
};

export default perfectMonth;
