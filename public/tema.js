/* Applica il tema PRIMA che la pagina venga disegnata.
   Caricato in modo bloccante nel <head>, e non inline: la CSP del sito è
   `script-src 'self'` e uno script inline verrebbe rifiutato. Senza questo, la
   pagina lampeggerebbe nel tema sbagliato a ogni caricamento. */
(function () {
  try {
    var scelto = localStorage.getItem('quotify:tema');
    document.documentElement.dataset.tema = scelto === 'chiaro' ? 'chiaro' : 'scuro';
  } catch (e) {
    document.documentElement.dataset.tema = 'scuro';
  }
})();
