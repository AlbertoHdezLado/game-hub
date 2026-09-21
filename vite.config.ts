import { defineConfig, loadEnv, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

type ConnectNext = (error?: unknown) => void;

function cleanGameRoutes(): Plugin {
  return {
    name: 'game-hub-clean-game-routes',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((request: IncomingMessage, _response: ServerResponse, next: ConnectNext) => {
        rewriteGameUrl(request);
        next();
      });
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use((request: IncomingMessage, _response: ServerResponse, next: ConnectNext) => {
        rewriteGameUrl(request);
        next();
      });
    },
  };
}

function rewriteGameUrl(request: { url?: string }) {
  const match = request.url?.match(/^\/games\/([^/?]+)\/?(?:\?.*)?$/);
  if (!match) return;

  request.url = `/games/${match[1]}/index.html`;
}

function supabaseConfig(): Plugin {
  let generatedSource = 'window.GAME_HUB_SUPABASE_CONFIG = {};';
  const configSource = (env: Record<string, string>) =>
    `window.GAME_HUB_SUPABASE_CONFIG = ${JSON.stringify({
      url: env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    })};`;

  return {
    name: 'game-hub-supabase-config',
    config(_, { mode }) {
      const env = loadEnv(mode, rootDir, '');
      generatedSource = configSource(env);
      return {};
    },
    configureServer(server) {
      server.middlewares.use('/supabase-config.js', (_request, response) => {
        response.setHeader('Content-Type', 'application/javascript');
        response.end(generatedSource);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'supabase-config.js', source: generatedSource });
    },
  };
}

export default defineConfig({
  plugins: [
    cleanGameRoutes(),
    supabaseConfig(),
    react(),
    tailwindcss(),
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
        navigateFallbackDenylist: [/^\/data\//, /^\/games\//],
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
