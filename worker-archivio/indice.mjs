// Worker dell'archiviatore — docs/raccoglitore-metriche-piano.md.
//
// Solo scheduled(), nessun fetch(): niente superficie HTTP, niente da
// proteggere. Un cron ogni ora; mestiere() sceglie il lavoro dall'ora,
// e nelle ore senza lavoro si esce subito.
//
// I segreti (GSC_CHIAVE, CF_ANALYTICS_TOKEN) restano qui dentro: nessun
// messaggio di log li contiene, e gli errori dei moduli sono scritti per
// non contenerli.

import { lettore } from '../lib/searchconsole.mjs';
import { cliente } from '../lib/cloudflare.mjs';
import { mestiere, lavoroCloudflare, lavoroGoogle, lavoroIndicizzazione, chiaveGoogle } from '../lib/archiviatore.mjs';

export default {
  async scheduled(controller, env) {
    const lavoro = mestiere(controller.scheduledTime);
    if (!lavoro) return;

    const oggi = new Date(controller.scheduledTime).toISOString().slice(0, 10);
    const presoIl = new Date().toISOString();
    const db = env.DB;

    if (lavoro === 'cloudflare') {
      const cf = cliente({ token: env.CF_ANALYTICS_TOKEN, account: env.CF_ACCOUNT_ID });
      await lavoroCloudflare({ db, cf, oggi, presoIl });
    } else if (lavoro === 'google') {
      await lavoroGoogle({ db, g: lettore(chiaveGoogle(env.GSC_CHIAVE)), oggi, presoIl });
    } else {
      await lavoroIndicizzazione({ db, g: lettore(chiaveGoogle(env.GSC_CHIAVE)), oggi, presoIl });
    }
  },
};
