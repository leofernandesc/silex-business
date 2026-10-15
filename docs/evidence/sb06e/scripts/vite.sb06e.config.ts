// Isolated component-test server only: do not watch generated test artifacts.
import { defineConfig } from 'vite';
import config from './vite.config';
export default defineConfig({
  ...config,
  server: {
    ...config.server,
    watch: { ignored: ['**/test-results*/**', '**/playwright-report/**'] },
  },
});
