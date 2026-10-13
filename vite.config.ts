import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { buildInfo } from './build-info.ts';

import {
  APP_ID,
  APP_NAME,
  APP_SCOPE,
  APP_SHORT_NAME,
  APP_START_URL,
  THEME_COLOR_LIGHT,
} from './src/config/app.ts';
import { APP_BASE_PATH } from './src/config/base-path.ts';

const previewCanonicalization = {
  name: 'only-tdy-preview-canonicalization',
  configurePreviewServer(server) {
    server.middlewares.use((request, response, next) => {
      const url = new URL(request.url ?? '/', 'http://only-tdy-preview');
      if (url.pathname !== '/only-tdy') {
        next();
        return;
      }
      response.statusCode = 302;
      response.setHeader('Location', `/only-tdy/${url.search}`);
      response.end();
    });
  },
} satisfies Plugin;

// The browser retains /only-tdy/ while the proxy strips that prefix.
export default defineConfig({
  base: APP_BASE_PATH,
  plugins: [
    react(),
    tailwindcss(),
    buildInfo(),
    previewCanonicalization,
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/infra',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: null,
      scope: APP_SCOPE,
      includeAssets: [
        'icons/favicon.svg',
        'icons/apple-touch-icon-180.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/maskable-512.png',
      ],
      manifest: {
        name: APP_NAME,
        short_name: APP_SHORT_NAME,
        id: APP_ID,
        start_url: APP_START_URL,
        scope: APP_SCOPE,
        display: 'standalone',
        background_color: THEME_COLOR_LIGHT,
        theme_color: THEME_COLOR_LIGHT,
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{html,js,css,woff2,svg,png,webmanifest}'],
      },
    }),
  ],
  build: {
    target: 'es2023',
    sourcemap: false,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
