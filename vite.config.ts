import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  // Relative asset paths, so the build works under any GitHub Pages path or custom domain.
  base: './',
  plugins: [react()],
  // Prebundled up front: found mid-run, Vite re-optimizes and browser tests load two copies of React.
  optimizeDeps: { include: ['react', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          // tokens.test.ts reads global.css as text; without this Vitest stubs CSS imports away.
          css: true,
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.browser.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
