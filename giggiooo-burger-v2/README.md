# Giggiooo Burger V2

Versione autonoma del concept Giggiooo Burger: tre burger interattivi, sei bevande e tre prodotti merchandising.

Sito statico pubblicato nella sottocartella giggiooo-burger-v2 del repository personal.smartlabdesign.it. La prima versione giggiooo-burger resta invariata. Prezzi, carrelli e preordini sono dimostrativi.

## Fattillu tu (configuratore)

Pagina `fattillu-tu/`: il cliente parte da Neon Bacon, Double Melt o Golden Burger e cambia gli strati a piacere (solo ingredienti dei tre signature). Gli sprite fotografici sono ritagliati dagli esplosi del menù.

- **Comanda**: alla chiusura del panino genera un'immagine con burger, ingredienti dall'alto verso il basso, sede, servizio e note.
- **Invio al locale**: in `fattillu-tu/config.js` si imposta il numero WhatsApp di ogni sede (formato internazionale senza "+"). Se il numero è vuoto, l'invio è simulato. Su smartphone la comanda viene condivisa come immagine; su desktop si apre WhatsApp con il testo precompilato.
- **Contorni e bibite**: patatine e onion rings nel fry box Giggiooo, bibite lette da `products.js` (immagini scontornate in `fattillu-tu/extras/`). Compaiono sul piano accanto al burger e nella comanda.
- **Prezzi**: `prices` in `config.js` (null = "Prezzo da definire").
