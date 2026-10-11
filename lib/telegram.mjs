// Un messaggio su Telegram — docs/cruscotto-piano.md §6.2.
//
// Restituisce true solo se Telegram conferma (`ok: true`): è quel true che
// autorizza a segnare l'avviso come inviato. Non lancia mai, e non scrive mai
// il token da nessuna parte: sta nell'indirizzo, e gli indirizzi finiscono
// nei messaggi d'errore.

export async function invia({ token, chat, testo, link = null, silenzioso = false, fetch: f = globalThis.fetch }) {
  try {
    const r = await f(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: link ? `${testo}\n${link}` : testo,
        disable_notification: silenzioso,
        link_preview_options: { is_disabled: true },
      }),
    });
    if (!r.ok) return false;
    const d = await r.json().catch(() => null);
    return d?.ok === true;
  } catch {
    return false;
  }
}
