import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';

const enablePwa = process.env.ENABLE_PWA === '1';

async function loadPwaPlugin(): Promise<PluginOption | null> {
  if (!enablePwa) return null;
  // Lazy import — vite-plugin-pwa@^0.21 needs Node ≥ 20.
  // Skip if not requested so Node 18 users can still build.
  const { VitePWA } = await import('vite-plugin-pwa');
  return VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
    manifest: {
      name: 'Quỹ Cầu Lông',
      short_name: 'CauLong',
      description: 'Quản lý thu chi nhóm cầu lông vãng lai',
      theme_color: '#0ea5e9',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      runtimeCaching: [
        {
          urlPattern: /\/api\/.*/,
          handler: 'NetworkFirst',
          options: { cacheName: 'api-cache', networkTimeoutSeconds: 5 }
        }
      ]
    }
  });
}

export default defineConfig(async () => {
  const pwa = await loadPwaPlugin();
  return {
    plugins: [react(), pwa].filter(Boolean) as PluginOption[],
    server: {
      port: 5173,
      proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } }
    }
  };
});
