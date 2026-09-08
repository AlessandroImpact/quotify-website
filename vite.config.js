import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const registro = JSON.parse(readFileSync(resolve(__dirname, 'data/pagine.json'), 'utf8'));

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Le entry vengono dal registro: aggiungere una pagina qui a mano era il
      // quarto posto da ricordare, ed è quello che fa fallire il build in modo
      // silenzioso — la pagina semplicemente non viene costruita.
      input: Object.fromEntries(
        registro.pagine.map((v) => [
          v.url === '/' ? 'main' : v.url.slice(1).replace(/\//g, '-'),
          resolve(__dirname, v.file),
        ]),
      ),
    },
  },
});
