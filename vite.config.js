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
      // Il cruscotto è l'unica eccezione, di proposito: non è una pagina del
      // sito (niente sitemap, niente Open Graph, niente beacon), quindi non
      // sta nel registro. docs/cruscotto-piano.md §4.6.
      input: {
        ...Object.fromEntries(
          registro.pagine.map((v) => [
            v.url === '/' ? 'main' : v.url.slice(1).replace(/\//g, '-'),
            resolve(__dirname, v.file),
          ]),
        ),
        cruscotto: resolve(__dirname, 'cruscotto.html'),
      },
    },
  },
});
