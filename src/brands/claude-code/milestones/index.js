import firstSession from './first-session.js';
import sessions from './sessions.js';
import tokens from './tokens.js';
import toolCalls from './tool-calls.js';
import activeHours from './active-hours.js';
import dispatches from './dispatches.js';
import webResearch from './web-research.js';
import fileEdits from './file-edits.js';

// 里程碑：起步与累计用量。分级徽章按 铜 → 银 → 金 升级，外圈和数字跟着换金属，
// 圆盘每级换一种珐琅色（$accent）；最高一级随机解锁三款之一（见 shared/top-tier.js）。

export default {
  id: 'milestones',
  title: '里程碑',
  subtitle: '起步与累计',
  en: { title: 'Milestones', subtitle: 'First steps and running totals' },
  badges: [firstSession, sessions, tokens, toolCalls, activeHours, dispatches, webResearch, fileEdits],
};
