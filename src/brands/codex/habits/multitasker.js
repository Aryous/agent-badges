import { cap, terminal } from '../../shared/parts.js';
import { codexMark } from '../mark.js';
import { medal } from '../medal.js';

// 多线并行：尖顶六边形，三个终端

const multitasker = {
  id: 'multitasker',
  title: '多线并行',
  titleEn: 'MULTITASKER',
  description: '同一时刻有 3 个 Codex 会话一起在跑。三块屏幕同时滚动，云朵在中间调度。',
  en: { title: 'Multitasker', description: '3 Codex sessions running at the same moment. Three screens scrolling, the cloud in the middle keeping order.' },
  criteria: { target: 3 },
  ...medal({
    bottom: 'MULTITASKER',
    shape: { type: 'polygon', sides: 6, radius: 1.08, cornerRadius: 0.18, rotation: Math.PI / 2, depth: 0.22, bevel: 0.045 },
    metal: 'silver',
    band: 'teal',
    disc: 'aqua',
    art: [
      ...codexMark({ size: 0.15, center: [0, 0.24], height: 0.06 }),
      ...[-0.27, 0, 0.27].flatMap((x, i) => terminal({ center: [x, -0.13], half: 0.1, panel: 'midnight', prompt: ['lime', 'amber', 'lavender'][i] })),
      // 云朵到三块屏幕的连线
      ...[-0.27, 0, 0.27].map((x) => cap([x * 0.35, 0.1], [x, -0.01], 0.014, 'silver', 0.02, 'polished-metal')),
    ],
  }),
};

export default multitasker;
