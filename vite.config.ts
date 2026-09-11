import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['resources/images/hub/logo-logo.svg'],
      manifest: {
        name: 'Game Hub',
        short_name: 'Game Hub',
        description: 'Juegos de mesa y fiesta para jugar en grupo.',
        theme_color: '#101a2b',
        background_color: '#101a2b',
        display: 'standalone',
        icons: [{ src: 'resources/images/hub/logo-logo.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        navigateFallbackDenylist: [/^\/legacy\//, /^\/data\//],
        runtimeCaching: [
          {
            urlPattern: /\/data\/.*\.json$/,
            handler: 'CacheFirst',
            options: { cacheName: 'game-content', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 } },
          },
          {
            urlPattern: /\/resources\/.*$/,
            handler: 'CacheFirst',
            options: { cacheName: 'game-resources' },
          },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(rootDir, 'src') } },
});
