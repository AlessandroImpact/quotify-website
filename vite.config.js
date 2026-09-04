import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        cookie: resolve(__dirname, 'cookie.html'),
        termini: resolve(__dirname, 'termini.html'),
        assistenza: resolve(__dirname, 'assistenza.html'),
        calcolatore: resolve(__dirname, 'calcolo-tasse-forfettario.html'),
        ateco: resolve(__dirname, 'ateco-2025-forfettario.html'),
        accantonare: resolve(__dirname, 'quanto-accantonare-tasse-partita-iva.html'),
      },
    },
  },
});
