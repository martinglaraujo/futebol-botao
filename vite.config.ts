import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// PWA: instalável e jogável offline (requisito central do projeto).
export default defineConfig({
  base: './',
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: { host: true, port: 5173 }, // host:true => acessível no tablet via IP da rede local
  build: { target: 'es2020', sourcemap: true },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/**/*'],
      manifest: {
        name: 'Futebol de Botão',
        short_name: 'BotãoFC',
        description: 'Futebol de botão offline e customizável.',
        theme_color: '#0b6b2e',
        background_color: '#0b6b2e',
        orientation: 'landscape',
        display: 'fullscreen',
        icons: [
          { src: 'assets/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'assets/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,mp3,ogg}'],
        // Áudio de hinos e sprites customizados também ficam em cache offline.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
  ],
});
