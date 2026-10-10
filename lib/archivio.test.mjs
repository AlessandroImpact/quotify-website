import { test } from 'node:test';
import assert from 'node:assert/strict';

import { apriInMemoria } from './d1-in-memoria.mjs';
import {
  FINESTRA_CLOUDFLARE, giorniIndietro, registraVisita, giorniDaFareCloudflare,
  istruzioneCloudflare, istruzioniGoogle, istruzioneErrore, contaIndicizzate,
  istruzioneIndicizzazione, istruzionePulizia,
} from './archivio.mjs';

const OGGI = '2026-10-10';
const PRESO = '2026-10-10T04:00:01.000Z';
const VISITA = {
  quando: '2026-10-09T10:00:00.000Z', giorno: '2026-10-09', percorso: '/',
  sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio', contenuto: null, termine: null,
  provenienza: 'www.linkedin.com', paese: 'IT',
};
const FOTO = (visite) => ({
  pagineViste: visite * 2, visite, campionamento: 1, pagine: [], provenienze: [],
  paesi: [], dispositivi: [], browser: [], vitals: null,
});
const riga = (db, giorno) => {
  const r = db.tutte(`SELECT * FROM storico WHERE giorno = '${giorno}'`)[0];
  return r && { ...r, dati: JSON.parse(r.dati) };
};

test('giorniIndietro parte da ieri, mai da oggi: oggi non è ancora finito', () => {
  assert.deepEqual(giorniIndietro(OGGI, 3), ['2026-10-09', '2026-10-08', '2026-10-07']);
  assert.deepEqual(giorniIndietro('2026-03-01', 1), ['2026-02-28']);
});

test('registraVisita scrive tutti i campi', async () => {
  const db = apriInMemoria();
  await registraVisita(db, VISITA);
  const [r] = db.tutte('SELECT * FROM visite');
  assert.equal(r.campagna, 'lancio');
  assert.equal(r.paese, 'IT');
  assert.equal(r.contenuto, null);
});

// --- Il punto più sorvegliato, n. 4: l'iniezione
test('un valore ostile si scrive come testo e la tabella sopravvive', async () => {
  const db = apriInMemoria();
  await registraVisita(db, { ...VISITA, campagna: "x'); drop table visite;--" });
  const r = db.tutte('SELECT campagna FROM visite');
  assert.deepEqual(r, [{ campagna: "x'); drop table visite;--" }]);
});

test('database vuoto: si fotografano tutti i 28 giorni della finestra, dal più recente', async () => {
  const db = apriInMemoria();
  const g = await giorniDaFareCloudflare(db, OGGI);
  assert.equal(g.length, FINESTRA_CLOUDFLARE);
  assert.equal(g[0], '2026-10-09');
  assert.equal(g.at(-1), '2026-09-12');
});

test('a regime si rifanno solo gli ultimi quattro giorni', async () => {
  const db = apriInMemoria();
  await db.batch(giorniIndietro(OGGI, 28).map((g) => istruzioneCloudflare(db, g, FOTO(1), PRESO)));
  assert.deepEqual(await giorniDaFareCloudflare(db, OGGI), ['2026-10-09', '2026-10-08', '2026-10-07', '2026-10-06']);
});

test('un buco in mezzo alla finestra si riempie la notte dopo', async () => {
  const db = apriInMemoria();
  const tutti = giorniIndietro(OGGI, 28);
  await db.batch(tutti.filter((g) => g !== '2026-09-20').map((g) => istruzioneCloudflare(db, g, FOTO(1), PRESO)));
  assert.ok((await giorniDaFareCloudflare(db, OGGI)).includes('2026-09-20'));
});

test('un giorno con solo i dati di Google conta come mancante per Cloudflare', async () => {
  const db = apriInMemoria();
  await db.batch(await istruzioniGoogle(db, [{ keys: ['2026-09-20'], clicks: 0, impressions: 3, position: 9 }], OGGI, PRESO));
  await db.batch(giorniIndietro(OGGI, 28).filter((g) => g !== '2026-09-20').map((g) => istruzioneCloudflare(db, g, FOTO(1), PRESO)));
  assert.ok((await giorniDaFareCloudflare(db, OGGI)).includes('2026-09-20'));
});

test('riscrivere lo stesso giorno aggiorna invece di duplicare', async () => {
  const db = apriInMemoria();
  await db.batch([istruzioneCloudflare(db, '2026-10-09', FOTO(5), PRESO)]);
  await db.batch([istruzioneCloudflare(db, '2026-10-09', FOTO(7), PRESO)]);
  assert.equal(db.tutte('SELECT count(*) n FROM storico')[0].n, 1);
  assert.equal(riga(db, '2026-10-09').visite, 7);
});

// --- Il punto più sorvegliato, n. 3: un errore non cancella un dato buono
test('un errore di Cloudflare su un giorno già buono lascia i numeri e annota la fonte', async () => {
  const db = apriInMemoria();
  await db.batch([istruzioneCloudflare(db, '2026-10-09', FOTO(5), PRESO)]);
  await db.batch([istruzioneCloudflare(db, '2026-10-09', null, PRESO)]);
  const r = riga(db, '2026-10-09');
  assert.equal(r.visite, 5);
  assert.equal(r.pagine_viste, 10);
  assert.equal(r.dati.fonti.cloudflare, 'errore');
  assert.equal(r.dati.cloudflare.visite, 5);
});

test('un errore su un giorno mai visto crea la riga con i numeri a NULL, non a zero', async () => {
  const db = apriInMemoria();
  await db.batch([istruzioneCloudflare(db, '2026-10-09', null, PRESO)]);
  const r = riga(db, '2026-10-09');
  assert.equal(r.visite, null);
  assert.equal(r.dati.fonti.cloudflare, 'errore');
});

test('un giorno con errore resta da rifare', async () => {
  const db = apriInMemoria();
  await db.batch(giorniIndietro(OGGI, 28).map((g) => istruzioneCloudflare(db, g, g === '2026-09-15' ? null : FOTO(1), PRESO)));
  assert.ok((await giorniDaFareCloudflare(db, OGGI)).includes('2026-09-15'));
});

test('Google e Cloudflare convivono nella stessa riga senza cancellarsi a vicenda', async () => {
  const db = apriInMemoria();
  await db.batch([istruzioneCloudflare(db, '2026-10-01', FOTO(4), PRESO)]);
  await db.batch(await istruzioniGoogle(db, [{ keys: ['2026-10-01'], clicks: 1, impressions: 9, position: 7.5 }], OGGI, PRESO));
  await db.batch([istruzioneIndicizzazione(db, '2026-10-01', [{ stato: 'Inviata e indicizzata' }], PRESO)]);
  const r = riga(db, '2026-10-01');
  assert.equal(r.visite, 4);
  assert.equal(r.impressioni, 9);
  assert.equal(r.posizione, 7.5);
  assert.equal(r.indicizzate, 1);
  assert.deepEqual(r.dati.fonti, { cloudflare: 'ok', google: 'ok', indicizzazione: 'ok' });
});

// --- Il punto più sorvegliato, n. 5: gli ultimi giorni di Search Console
test('Google: un giorno vecchio assente dalla risposta è uno zero; uno recente è «non ancora»', async () => {
  const db = apriInMemoria();
  const righe = [{ keys: ['2026-10-01'], clicks: 0, impressions: 2, position: 40 }];
  await db.batch(await istruzioniGoogle(db, righe, OGGI, PRESO));
  assert.equal(riga(db, '2026-10-02').impressioni, 0);        // 8 giorni fa, assente: zero
  assert.equal(riga(db, '2026-10-06').impressioni, 0);        // 4 giorni fa: ormai definitivo
  assert.equal(riga(db, '2026-10-07'), undefined);            // 3 giorni fa: non ancora
  assert.equal(riga(db, '2026-10-09'), undefined);            // ieri: non ancora
  assert.equal(riga(db, '2026-10-02').posizione, null);       // zero impressioni: nessuna posizione
});

test('Google: niente righe prima del primo giorno con dati — il sito non esisteva', async () => {
  const db = apriInMemoria();
  await db.batch(await istruzioniGoogle(db, [{ keys: ['2026-09-30'], clicks: 0, impressions: 1, position: 12 }], OGGI, PRESO));
  assert.equal(riga(db, '2026-09-29'), undefined);
  assert.equal(db.tutte('SELECT min(giorno) g FROM storico')[0].g, '2026-09-30');
});

test('Google: un giorno recente presente nella risposta si scrive, ed è da riscrivere domani', async () => {
  const db = apriInMemoria();
  await db.batch(await istruzioniGoogle(db, [{ keys: ['2026-10-08'], clicks: 0, impressions: 1, position: 5 }], OGGI, PRESO));
  assert.equal(riga(db, '2026-10-08').impressioni, 1);
});

test('Google: risposta vuota, nessuna istruzione', async () => {
  assert.deepEqual(await istruzioniGoogle(apriInMemoria(), [], OGGI, PRESO), []);
});

test('Google: i giorni già scritti e vecchi non si riscrivono ogni notte', async () => {
  const db = apriInMemoria();
  const righe = [{ keys: ['2026-08-01'], clicks: 0, impressions: 1, position: 5 }];
  await db.batch(await istruzioniGoogle(db, righe, OGGI, PRESO));
  const seconda = await istruzioniGoogle(db, righe, OGGI, PRESO);
  // restano solo i giorni recenti degli ultimi quattro, e solo se presenti o definitivi
  assert.ok(seconda.length < 10, `troppe istruzioni: ${seconda.length}`);
});

test('istruzioneErrore annota la fonte senza toccare i numeri', async () => {
  const db = apriInMemoria();
  await db.batch(await istruzioniGoogle(db, [{ keys: ['2026-10-01'], clicks: 2, impressions: 9, position: 7 }], OGGI, PRESO));
  await db.batch([istruzioneErrore(db, '2026-10-01', 'google', PRESO)]);
  const r = riga(db, '2026-10-01');
  assert.equal(r.impressioni, 9);
  assert.equal(r.dati.fonti.google, 'errore');
});

test('contaIndicizzate: «non indicizzata» non conta, gli errori nemmeno', () => {
  assert.equal(contaIndicizzate([
    { stato: 'Inviata e indicizzata' },
    { stato: 'Inviata e indicizzata' },
    { stato: 'Pagina scansionata, ma attualmente non indicizzata' },
    { stato: 'Rilevata, ma attualmente non indicizzata' },
    { stato: "L'URL è sconosciuto a Google" },
    { stato: 'errore: Search Console 429' },
  ]), 2);
});

test('istruzioneIndicizzazione conserva lo stato di ogni pagina in dati', async () => {
  const db = apriInMemoria();
  const esiti = [{ url: 'https://quotify.it/', stato: 'Inviata e indicizzata', ultimaScansione: '2026-10-06' }];
  await db.batch([istruzioneIndicizzazione(db, OGGI, esiti, PRESO)]);
  assert.deepEqual(riga(db, OGGI).dati.indicizzazione, esiti);
});

test('la pulizia cancella le visite oltre 26 mesi e lascia le altre', async () => {
  const db = apriInMemoria();
  await registraVisita(db, { ...VISITA, giorno: '2024-08-01' });
  await registraVisita(db, { ...VISITA, giorno: '2024-09-01' });
  await db.batch([istruzionePulizia(db, OGGI)]);
  assert.deepEqual(db.tutte('SELECT giorno FROM visite'), [{ giorno: '2024-09-01' }]);
});
