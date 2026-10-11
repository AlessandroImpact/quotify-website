// Worker dell'archiviatore — docs/raccoglitore-metriche-piano.md e
// docs/cruscotto-piano.md §6.2.
//
// Solo scheduled(), nessun fetch(): niente superficie HTTP, niente da
// proteggere. Un cron ogni ora; mestiere() sceglie il lavoro dall'ora, e gli
// avvisi girano a ogni ora DOPO il lavoro. I due sono indipendenti: un lavoro
// fallito non ferma gli avvisi (che anzi possono dire che è fallito), e un
// avviso fallito non ferma l'archivio. Alla fine l'esecuzione risulta fallita
// se uno dei due è fallito, così le statistiche del Worker lo mostrano.
//
// I segreti (GSC_CHIAVE, CF_ANALYTICS_TOKEN, TELEGRAM_TOKEN, TELEGRAM_CHAT,
// RIASSUNTO_CHIAVE) restano qui dentro: nessun messaggio di log li contiene.

import { lettore } from '../lib/searchconsole.mjs';
import { cliente } from '../lib/cloudflare.mjs';
import { leggiRiassunto } from '../lib/riassunto.mjs';
import { invia } from '../lib/telegram.mjs';
import { silenzioso } from '../lib/avvisi.mjs';
import {
  mestiere, lavoroCloudflare, lavoroGoogle, lavoroIndicizzazione, chiaveGoogle, raccogliAvvisi, lavoroAvvisi,
} from '../lib/archiviatore.mjs';

export default {
  async scheduled(controller, env) {
    const istante = controller.scheduledTime;
    const oggi = new Date(istante).toISOString().slice(0, 10);
    const presoIl = new Date().toISOString();
    const db = env.DB;
    let errore = null;

    try {
      const lavoro = mestiere(istante);
      if (lavoro === 'cloudflare') {
        const cf = cliente({ token: env.CF_ANALYTICS_TOKEN, account: env.CF_ACCOUNT_ID });
        await lavoroCloudflare({ db, cf, oggi, presoIl });
      } else if (lavoro === 'google') {
        await lavoroGoogle({ db, g: lettore(chiaveGoogle(env.GSC_CHIAVE)), oggi, presoIl });
      } else if (lavoro === 'indicizzazione') {
        await lavoroIndicizzazione({ db, g: lettore(chiaveGoogle(env.GSC_CHIAVE)), oggi, presoIl });
      }
    } catch (e) {
      errore = e;
    }

    try {
      if (env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT) {
        const avvisi = await raccogliAvvisi({
          db, istante, oggi,
          riassunto: ({ da, a }) => leggiRiassunto({ chiave: env.RIASSUNTO_CHIAVE, da, a }),
        });
        await lavoroAvvisi({
          db, avvisi, presoIl, silenzioso: silenzioso(istante),
          invia: (m) => invia({ token: env.TELEGRAM_TOKEN, chat: env.TELEGRAM_CHAT, ...m }),
        });
      }
    } catch (e) {
      console.log(`avvisi: ${e.message}`);
      errore ??= e;
    }

    if (errore) throw errore;
  },
};
