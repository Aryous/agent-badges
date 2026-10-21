import subagentCommander from './subagent-commander.js';
import hooksSmith from './hooks-smith.js';
import connector from './connector.js';
import skillMaster from './skill-master.js';
import planMode from './plan-mode.js';
import autopilot from './autopilot.js';

// 功能探索：每个 Claude Code 能力一枚。除子代理指挥官外，共用「App 图标」骨架（../app-icon.js）。

export default {
  id: 'features',
  title: '功能探索',
  subtitle: '解锁每一种能力',
  en: { title: 'Features', subtitle: 'Unlock every capability' },
  badges: [subagentCommander, hooksSmith, connector, skillMaster, planMode, autopilot],
};
