import multiAgent from './multi-agent.js';
import planTracker from './plan-tracker.js';
import deepThinker from './deep-thinker.js';
import fullAuto from './full-auto.js';
import reviewer from './reviewer.js';
import ideBuddy from './ide-buddy.js';

// 功能探索：每个 Codex 能力一枚，共用「工牌」骨架（../feature-frame.js）。

export default {
  id: 'features',
  title: '功能探索',
  subtitle: '解锁每一种能力',
  en: { title: 'Features', subtitle: 'Unlock every capability' },
  badges: [multiAgent, planTracker, deepThinker, fullAuto, reviewer, ideBuddy],
};
