import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      // VitePWA({
      //   registerType: 'autoUpdate',
      //   workbox: {
      //     maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      //   },
      //   includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      //   manifest: {
      //     id: '/',
      //     name: 'TeleMoto+ Moçambique',
      //     short_name: 'TeleMoto+',
      //     description: 'Plataforma oficial de mototáxi rápida, segura e económica em Moçambique.',
      //     theme_color: '#171717',
      //     background_color: '#171717',
      //     display: 'standalone',
      //     start_url: '/',
      //     scope: '/',
      //     icons: [
      //       {
      //         src: '/icon-192.png',
      //         sizes: '192x192',
      //         type: 'image/png',
      //         purpose: 'any',
      //       },
      //       {
      //         src: '/icon-512.png',
      //         sizes: '512x512',
      //         type: 'image/png',
      //         purpose: 'any',
      //       },
      //       {
      //         src: '/maskable-icon-512.png',
      //         sizes: '512x512',
      //         type: 'image/png',
      //         purpose: 'maskable',
      //       },
      //     ],
      //   },
      //   devOptions: {
      //     enabled: true,
      //     type: 'module',
      //   },
      // }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
