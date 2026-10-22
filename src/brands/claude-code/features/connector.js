import { appIcon, mascot, px } from '../app-icon.js';

// 连接者：App 图标家族；插头的电线垂下来被小怪物抱住。

// 插头：两根插脚 + 插头体 + 电线
const PLUG = [
  '##########',
  '##########',
  '##########',
  '##########',
  '##########',
  '.########.',
  '...####...',
  '...####...',
];

const PLUG_PINS = [
  '.##....##.',
  '.##....##.',
  '.##....##.',
];

const connector = appIcon({
  id: 'connector',
  title: '连接者',
  description: '接入 3 个 MCP 服务。小家伙的插座越来越多了。',
  en: { title: 'MCP Connector', description: 'Connected 3 MCP servers. The little guy keeps growing more sockets.' },
  criteria: { target: 3 },
  rim: 'magenta',
  face: 'plum',
  panel: 'scarlet',
  name: 'MCP',
  art: [
    // 插头 + 插脚
    // 插头 + 插脚，电线垂下来被小怪物抱住
    px(PLUG, 0.032, [0, 0.12], 'snow', 'enamel', 0.06),
    px(PLUG_PINS, 0.032, [0, 0.12 + 0.032 * 5.5], 'silver', 'polished-metal', 0.07),
    { kind: 'capsule', from: [0, -0.01], to: [0, -0.2], width: 0.03, material: 'enamel', color: 'snow', height: 0.035 },
    ...mascot(0.021, [0, -0.3]),
  ],
});

export default connector;
