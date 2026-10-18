// 从 OFL 字体中提取文字环需要的字形轮廓，生成 src/engine/fonts/ring-font.json。
// 运行时只用这份轮廓数据，不需要加载完整字体，Node 单元测试里也能直接构建文字几何。
// 用法：node scripts/build-font.mjs
import * as opentype from 'opentype.js';
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'node_modules/@fontsource/outfit/files/outfit-latin-700-normal.woff';
const OUT = 'src/engine/fonts/ring-font.json';
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-·./&+:#';

const buf = readFileSync(SRC);
const font = (opentype.parse ?? opentype.default.parse)(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const upm = font.unitsPerEm;
const round = (v) => Math.round((v / upm) * 10000) / 10000; // 以 1 em 为单位，保留 4 位小数

const glyphs = {};
for (const ch of CHARS) {
  const g = font.charToGlyph(ch);
  if (!g || g.index === 0) throw new Error(`字体缺少字符：${ch}`);
  // getPath 的 y 轴向下，这里翻回 y 轴向上，方便直接给 three 使用
  const cmds = g.getPath(0, 0, upm).commands.map((c) => {
    switch (c.type) {
      case 'M':
      case 'L':
        return [c.type, round(c.x), round(-c.y)];
      case 'Q':
        return ['Q', round(c.x1), round(-c.y1), round(c.x), round(-c.y)];
      case 'C':
        return ['C', round(c.x1), round(-c.y1), round(c.x2), round(-c.y2), round(c.x), round(-c.y)];
      case 'Z':
        return ['Z'];
      default:
        throw new Error(`未知路径命令 ${c.type}`);
    }
  });
  glyphs[ch] = { advance: round(g.advanceWidth), cmds };
}
glyphs[' '] = { advance: round(font.charToGlyph(' ').advanceWidth), cmds: [] };

const data = {
  family: font.names.fontFamily?.en ?? 'Outfit',
  license: 'SIL Open Font License 1.1',
  capHeight: round(font.tables.os2.sCapHeight),
  glyphs,
};
writeFileSync(OUT, JSON.stringify(data));
console.log(`写入 ${OUT}：${Object.keys(glyphs).length} 个字形，capHeight=${data.capHeight}`);
