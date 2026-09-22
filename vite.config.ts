import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

type ConnectNext = (error?: unknown) => void;

function localSecretCodeApi(): Plugin {
  return {
    name: 'game-hub-local-secret-code-api',
    configureServer(server) {
      server.middlewares.use('/api/secret-code', async (request, response, next) => {
        if (request.method !== 'POST' && request.method !== 'GET') {
          next();
          return;
        }

        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        const body = Buffer.concat(chunks).toString('utf8');
        const apiModule = await import('./api/secret-code.js');
        const handlerResponse = {
          statusCode: 200,
          status(code: number) {
            this.statusCode = code;
            return this;
          },
          setHeader(name: string, value: string) {
            response.setHeader(name, value);
          },
          end(value: string) {
            response.statusCode = this.statusCode;
            response.end(value);
          },
        };

        await apiModule.default({
          method: request.method,
          url: request.url || '/api/secret-code',
          headers: request.headers,
          body,
        }, handlerResponse);
      });
    },
  };
}

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

export default defineConfig({
  plugins: [
    localSecretCodeApi(),
    cleanGameRoutes(),
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
