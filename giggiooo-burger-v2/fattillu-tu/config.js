/* Fattillu tu — configurazione.
 * whatsapp: numero della sede in formato internazionale senza "+" (es. '393331234567').
 *           Vuoto = invio simulato: la comanda viene mostrata come anteprima, nulla viene inviato.
 * prices:   prezzi per ingrediente (es. { manzo: 3.5, bacon: 1.5, ... }) e base del panino.
 *           null = "Prezzo da definire", come nel resto della demo.
 */
window.FT_CONFIG = {
  locations: {
    studio: { name: 'Giggiooo Studio', whatsapp: '' },
    lab: { name: 'Giggiooo Lab', whatsapp: '' }
  },
  prices: null
};
