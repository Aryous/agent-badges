import { drawBrushedRings, canvasTexture, makeCanvas } from './textures.js';

// 背面刻字：用 Canvas 生成三张贴图（颜色、凹凸、粗糙度），
// 让文字看起来像刻进金属或陶瓷里。

/**
 * @param {object} opts
 * @param {string[]} opts.lines   [小标题, 主标题, 英文标题, 日期或进度]
 * @param {string}  opts.fontFamily
 * @param {number}  opts.safeRadius  文字可用区域半径（相对徽章外接半径，0~1）
 * @param {boolean} opts.brushed     底面是否带拉丝纹理
 * @param {number}  opts.ink         刻字颜色深浅（0~1，越小越深）
 * @param {number}  opts.base        底面颜色（0~1）。ink > base 时文字比底面亮，用于深色的未解锁剪影
 */
export function createEngraving({ lines, fontFamily, safeRadius = 0.7, brushed = false, ink = 0.55, base = 1, size = 1024 }) {
  const color = makeCanvas(size);
  const bump = makeCanvas(size);
  const rough = makeCanvas(size);
  const cc = color.getContext('2d');
  const bc = bump.getContext('2d');
  const rc = rough.getContext('2d');

  // 底色
  const baseGray = Math.round(255 * base);
  cc.fillStyle = `rgb(${baseGray},${baseGray},${baseGray})`;
  cc.fillRect(0, 0, size, size);
  if (brushed) {
    drawBrushedRings(bc, size);
    drawBrushedRings(rc, size, { base: 150, spread: 60 });
  } else {
    bc.fillStyle = 'rgb(200,200,200)';
    bc.fillRect(0, 0, size, size);
    rc.fillStyle = 'rgb(225,225,225)';
    rc.fillRect(0, 0, size, size);
  }

  const inkGray = Math.round(255 * ink);
  const paint = (draw) => {
    for (const [ctx, style] of [
      [cc, `rgb(${inkGray},${inkGray},${inkGray})`],
      [bc, 'rgb(20,20,20)'],
      [rc, 'rgb(255,255,255)'],
    ]) {
      ctx.save();
      // 背面从后方观看时 x 轴是反的，所以要水平镜像
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
      ctx.fillStyle = style;
      ctx.strokeStyle = style;
      draw(ctx);
      ctx.restore();
    }
  };

  const [kicker, title, subtitle, footer] = lines;
  const cx = size / 2;
  const unit = (size / 2) * safeRadius; // 安全区半径（像素）

  paint((ctx) => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (kicker) {
      ctx.font = `600 ${unit * 0.085}px ${fontFamily}`;
      ctx.letterSpacing = `${unit * 0.03}px`;
      ctx.fillText(kicker, cx, cx - unit * 0.56);
    }

    ctx.letterSpacing = '0px';
    ctx.font = `600 ${unit * 0.27}px ${fontFamily}`;
    fitText(ctx, title, cx, cx - unit * 0.18, unit * 1.6);

    if (subtitle) {
      ctx.font = `500 ${unit * 0.08}px ${fontFamily}`;
      ctx.letterSpacing = `${unit * 0.035}px`;
      ctx.fillText(subtitle, cx, cx + unit * 0.12);
    }

    // 分隔线
    ctx.lineWidth = Math.max(2, unit * 0.008);
    ctx.beginPath();
    ctx.moveTo(cx - unit * 0.22, cx + unit * 0.3);
    ctx.lineTo(cx + unit * 0.22, cx + unit * 0.3);
    ctx.stroke();

    if (footer) {
      ctx.letterSpacing = `${unit * 0.02}px`;
      ctx.font = `500 ${unit * 0.11}px ${fontFamily}`;
      ctx.fillText(footer, cx, cx + unit * 0.48);
    }
  });

  return {
    map: canvasTexture(color, { srgb: true }),
    bumpMap: canvasTexture(bump),
    roughnessMap: canvasTexture(rough),
  };
}

/** 文字过宽时等比缩小字号。 */
function fitText(ctx, text, x, y, maxWidth) {
  const w = ctx.measureText(text).width;
  if (w > maxWidth) {
    const size = parseFloat(ctx.font.match(/(\d+(\.\d+)?)px/)[1]);
    ctx.font = ctx.font.replace(/(\d+(\.\d+)?)px/, `${(size * maxWidth) / w}px`);
  }
  ctx.fillText(text, x, y);
}
