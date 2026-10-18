// GitHub Pages 站点：落地页在根目录，演示用的徽章墙（示例数据）在 /demo/。
// 用法：npm run build:site → dist-site/
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500, // three.js 本身就有 600 KB
    outDir: 'dist-site',
    emptyOutDir: true,
    rollupOptions: { input: { index: 'landing.html' } },
  },
});
