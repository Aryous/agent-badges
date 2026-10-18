// 生成扁平版标志 SVG（favicon、README 小图标用）：金色花边 + 午夜蓝 + 象牙白圆盘 + 渐变四角星。
import { writeFileSync, mkdirSync } from 'node:fs';
import { SPARKLE } from '../src/project/logo.js';

const scallop = (cx, cy, r, inner, n) => {
  const pts = [];
  const steps = n * 12;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2 - Math.PI / 2;
    const k = (Math.cos(a * n) + 1) / 2; // 0..1 波浪
    const rr = inner + (r - inner) * Math.pow(k, 0.7);
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
};

const svg = ({ text = true } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F4D58D"/><stop offset=".5" stop-color="#D9B061"/><stop offset="1" stop-color="#A8803A"/>
    </linearGradient>
    <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F2713A"/><stop offset=".5" stop-color="#C44FD6"/><stop offset="1" stop-color="#3550FF"/>
    </linearGradient>
  </defs>
  <path d="${scallop(64, 64, 63, 57, 16)}" fill="url(#gold)"/>
  ${text ? '<circle cx="64" cy="64" r="52" fill="#1E2F6E"/>' : ''}
  <circle cx="64" cy="64" r="${text ? 35 : 50}" fill="${text ? '#F3F0E8' : '#1E2F6E'}" stroke="url(#gold)" stroke-width="3"/>
  ${text ? `<path id="arcTop" d="M22 64a42 42 0 0 1 84 0" fill="none"/><path id="arcBottom" d="M18 64a46 46 0 0 0 92 0" fill="none"/>
  <text font-family="Outfit, 'Helvetica Neue', Arial, sans-serif" font-weight="700" font-size="9.5" letter-spacing="2.4" fill="#E6C47A"><textPath href="#arcTop" startOffset="50%" text-anchor="middle">AGENT BADGES</textPath></text>
  <text font-family="Outfit, 'Helvetica Neue', Arial, sans-serif" font-weight="700" font-size="9.5" letter-spacing="2.4" fill="#E6C47A"><textPath href="#arcBottom" startOffset="50%" text-anchor="middle">ACHIEVEMENTS</textPath></text>` : ''}
  <g transform="translate(64 64) scale(${text ? 2.3 : 3.5}) translate(-12 -12)"><path d="${SPARKLE}" fill="url(#spark)"/></g>
</svg>
`;

mkdirSync('assets', { recursive: true });
writeFileSync('assets/logo.svg', svg());
writeFileSync('assets/favicon.svg', svg({ text: false }));
console.log('assets/logo.svg assets/favicon.svg');
