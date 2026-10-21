// Template for a one-time, counted badge. Copy to src/brands/<tool>/<series>/<id>.js and rename.
// Import paths below are written as if this file lived in src/brands/claude-code/habits/.
// Modeled on src/brands/claude-code/habits/productive-day.js. Keep the Chinese header comment style
// of the real badge files when you copy it (code comments in src/ are in Chinese).

// Height of the center disc: art placed on the disc is lifted by this much.
import { MEDALLION_H as Z } from '../../shared/layout.js';
// Shared drawing parts (see references/parts.md); pick what the art needs.
import { terminal } from '../../shared/parts.js';
// Brand anchor: Claude Code uses the pixel mascot; Codex uses codexMark from '../mark.js'.
import { clawd } from '../mascot.js';
// The tool's round medal: rim, edge line that follows the outline, text ring, disc, auto breathing room.
import { medal } from '../medal.js';

// 示例徽章：一句中文说明它的造型（外形 + 画面），和真实徽章文件的头注释一样

const exampleBadge = {
  // Unique per tool, kebab-case; also the key in RULES, mock data and FIXTURES.
  id: 'example-badge',
  // Chinese title shown on the wall and the inspector.
  title: '示例徽章',
  // Uppercase English title engraved on the back (only glyphs the badge font has).
  titleEn: 'EXAMPLE BADGE',
  // Chinese description; must state the target number (20) — tests/contracts.test.js checks it.
  description: '一天之内开启 20 个会话。一句画面感的话，说清这枚徽章在庆祝什么。',
  // English title and description; the description must state the same number.
  en: { title: 'Example Badge', description: 'Started 20 sessions in a single day. One vivid line about what this badge celebrates.' },
  // The threshold lives here only; the rule reads it. Tiered badges use `tiers` instead and drop `criteria`.
  criteria: { target: 20 },
  // medal() returns shape, layers, relief and back; spread it into the config.
  ...medal({
    // Bottom arc of the text ring: short uppercase label, usually the number and unit.
    bottom: '20 SESSIONS',
    // Outline (see references/parts.md › Shapes); here a soft ten-point star.
    shape: { type: 'starburst', points: 10, radius: 1.07, innerRadius: 0.9, tipRoundness: 0.22, valleyRoundness: 0.12, depth: 0.22, bevel: 0.035 },
    // Palette key for the rim, edge line and lettering.
    metal: 'gold',
    // Palette key for the dark enamel band behind the text ring.
    band: 'teal',
    // Palette key for the bright center disc.
    disc: 'aqua',
    // Art on the disc, designed for a disc radius of 0.56 (medal() rescales it when the outline is tight).
    art: [
      // Stacked windows: each one a little higher (z) so they overlap cleanly.
      ...terminal({ center: [-0.15, 0.2], half: 0.13, panel: 'slate', z: Z }),
      ...terminal({ center: [0, 0.1], half: 0.13, panel: 'navy', z: Z + 0.035 }),
      ...terminal({ center: [0.15, 0], half: 0.13, panel: 'ink', z: Z + 0.07 }),
      // The brand anchor interacting with the scene.
      ...clawd({ cell: 0.017, center: [-0.12, -0.27], height: 0.055 }),
    ],
  }),
};

// One default export per badge file; the series index.js imports it.
export default exampleBadge;
