import { defineConfig } from 'vite';
import uniPlugin from '@dcloudio/vite-plugin-uni';

const uni =
  typeof uniPlugin === 'function'
    ? uniPlugin
    : (uniPlugin as { default?: () => unknown }).default;

export default defineConfig({
  plugins: uni ? [uni()] : []
});
