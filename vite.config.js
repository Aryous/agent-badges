import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: { target: 'es2022', assetsInlineLimit: 100000000 },
  // 组装全部徽章的测试较重，机器负载高时可能超过默认的 5 秒
  test: { environment: 'node', include: ['tests/**/*.test.js'], testTimeout: 30000 },
});
