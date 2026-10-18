import { ExtrudeGeometry, ShapePath } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import font from './fonts/ring-font.json';

// 文字环：沿圆弧排布立体字母，像钱币和奖章边缘的铭文。
// 字形轮廓来自 scripts/build-font.mjs 生成的 ring-font.json（单位：1 em，y 轴向上）。

export const RING_FONT = font;

export function hasGlyph(ch) {
  return Object.prototype.hasOwnProperty.call(font.glyphs, ch);
}

/** 单个字形 → Shape 数组（单位：em）。 */
export function glyphShapes(ch) {
  const g = font.glyphs[ch];
  if (!g) throw new Error(`文字环字体缺少字符「${ch}」`);
  const path = new ShapePath();
  for (const c of g.cmds) {
    switch (c[0]) {
      case 'M':
        path.moveTo(c[1], c[2]);
        break;
      case 'L':
        path.lineTo(c[1], c[2]);
        break;
      case 'Q':
        path.quadraticCurveTo(c[1], c[2], c[3], c[4]);
        break;
      case 'C':
        path.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]);
        break;
      default:
        break; // Z：ShapePath 会自动闭合
    }
  }
  return path.toShapes(false);
}

/**
 * 计算每个字符在弧上的角度（弧度）。
 * arc = 'top'：文字在上半圈，从左往右读，字头朝外；
 * arc = 'bottom'：文字在下半圈，从左往右读，字头朝内。
 */
export function layoutArc({ text, radius, size, tracking = 0.2, wordSpacing = 0.35, arc = 'top' }) {
  const em = size / font.capHeight; // 让大写字母高度等于 size
  const widths = [...text].map((ch) => {
    if (!hasGlyph(ch)) throw new Error(`文字环字体缺少字符「${ch}」`);
    // 字距加大后，空格要同步加宽，否则单词会粘在一起
    return font.glyphs[ch].advance * em + tracking * size + (ch === ' ' ? wordSpacing * size : 0);
  });
  const total = widths.reduce((a, b) => a + b, 0) - tracking * size;
  const span = total / radius;
  const dir = arc === 'top' ? -1 : 1; // 上弧从左往右是角度递减
  const mid = arc === 'top' ? Math.PI / 2 : -Math.PI / 2;
  let acc = 0;
  return {
    em,
    span,
    chars: [...text].map((ch, i) => {
      const center = acc + (font.glyphs[ch].advance * em) / 2;
      acc += widths[i];
      return { ch, angle: mid + dir * (center - total / 2) / radius };
    }),
  };
}

/**
 * 生成整圈文字的合并几何体，底面在 z=0，向 +z 凸起 height。
 */
export function arcTextGeometry({ text, radius, size, tracking, arc = 'top', height = 0.03, bevel = 0.006 }) {
  const { em, chars } = layoutArc({ text, radius, size, tracking, arc });
  const b = Math.min(bevel, height * 0.4);
  const parts = [];
  for (const { ch, angle } of chars) {
    const g = font.glyphs[ch];
    if (!g.cmds.length) continue; // 空格
    const geo = new ExtrudeGeometry(glyphShapes(ch), {
      depth: Math.max(0.001, height / em - (2 * b) / em),
      bevelEnabled: true,
      bevelThickness: b / em,
      bevelSize: (b * 0.7) / em,
      bevelOffset: (-b * 0.7) / em,
      bevelSegments: 2,
      curveSegments: 6,
    });
    geo.translate(-g.advance / 2, 0, b / em);
    geo.scale(em, em, em);
    if (arc === 'top') {
      geo.translate(0, radius - size / 2, 0);
      geo.rotateZ(angle - Math.PI / 2);
    } else {
      geo.translate(0, -(radius + size / 2), 0);
      geo.rotateZ(angle + Math.PI / 2);
    }
    parts.push(geo);
  }
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

/** 单个字形挤出，原点在字形左下（基线），单位：徽章单位。 */
function glyphGeometry(ch, em, height, bevel) {
  const g = font.glyphs[ch];
  const b = Math.min(bevel, height * 0.4);
  const geo = new ExtrudeGeometry(glyphShapes(ch), {
    depth: Math.max(0.001, height / em - (2 * b) / em),
    bevelEnabled: true,
    bevelThickness: b / em,
    bevelSize: (b * 0.7) / em,
    bevelOffset: (-b * 0.7) / em,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.translate(0, 0, b / em);
  geo.scale(em, em, em);
  return { geo, advance: g.advance * em };
}

/**
 * 水平排布的立体文字（中心大数字等），以 center 为中心，大写字母高度为 size。
 * 底面在 z=0，向 +z 凸起 height。
 */
export function textGeometry({ text, size, center = [0, 0], tracking = 0.04, height = 0.05, bevel = size * 0.07 }) {
  const em = size / font.capHeight;
  const chars = [...text];
  chars.forEach((ch) => {
    if (!hasGlyph(ch)) throw new Error(`文字环字体缺少字符「${ch}」`);
  });
  const total =
    chars.reduce((w, ch) => w + font.glyphs[ch].advance * em + tracking * size, 0) - tracking * size;
  let x = center[0] - total / 2;
  const parts = [];
  for (const ch of chars) {
    const { geo, advance } = glyphGeometry(ch, em, height, bevel);
    if (font.glyphs[ch].cmds.length) {
      geo.translate(x, center[1] - size / 2, 0);
      parts.push(geo);
    } else {
      geo.dispose();
    }
    x += advance + tracking * size;
  }
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}
