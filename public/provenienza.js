/* Provenienza dell'iscrizione — docs/cruscotto-piano.md §7.1.

   Sui link verso app.quotify.it/register aggiunge da dove è arrivato chi sta
   leggendo QUESTA pagina: gli UTM della pagina (se ci sono, sostituiscono
   quelli interni del bottone, che dicono solo quale bottone) e l'host del
   referrer esterno, come `rif`. L'app li salva all'iscrizione.

   Niente cookie, niente memoria del browser: chi passa da un'altra pagina
   del sito prima di iscriversi perde la provenienza. È il prezzo, dichiarato,
   di non tracciare nessuno.

   Script classico e non modulo: sta in public/, e Vite lo serve così com'è.
   Le funzioni sono globali di proposito: lib/provenienza.test.mjs le prende
   eseguendo questo file in un contesto isolato. */

var UTM_PROVENIENZA = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

function pulisciProvenienza(v) {
  return String(v || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().toLowerCase().slice(0, 200);
}

function hostEsterno(referrer, ospite) {
  try {
    var h = new URL(referrer).hostname.toLowerCase();
    if (!h || h === ospite || h.slice(-(ospite.length + 1)) === '.' + ospite) return null;
    return h;
  } catch (e) {
    return null;
  }
}

function conProvenienza(href, paginaUrl, referrer) {
  var u;
  try {
    u = new URL(href);
  } catch (e) {
    return href;
  }
  if (u.hostname !== 'app.quotify.it' || u.pathname !== '/register') return href;

  // `rif` va sempre in fondo: lo si toglie e lo si rimette, così una seconda
  // esecuzione produce lo stesso identico link.
  var rifPrima = u.searchParams.get('rif');
  u.searchParams.delete('rif');
  var pagina = new URL(paginaUrl);
  var delVisitatore = UTM_PROVENIENZA.filter(function (k) { return pulisciProvenienza(pagina.searchParams.get(k)); });
  if (delVisitatore.length) {
    UTM_PROVENIENZA.forEach(function (k) { u.searchParams.delete(k); });
    delVisitatore.forEach(function (k) { u.searchParams.set(k, pulisciProvenienza(pagina.searchParams.get(k))); });
  }
  var rif = hostEsterno(referrer, pagina.hostname.replace(/^www\./, '')) || rifPrima;
  if (rif) u.searchParams.set('rif', rif);
  return u.toString();
}

if (typeof document !== 'undefined') {
  var applicaProvenienza = function () {
    var link = document.querySelectorAll('a[href^="https://app.quotify.it/register"]');
    for (var i = 0; i < link.length; i++) {
      link[i].href = conProvenienza(link[i].href, location.href, document.referrer);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applicaProvenienza);
  else applicaProvenienza();
}
