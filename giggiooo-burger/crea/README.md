# Giggiooo Burger — Configuratore "Crea il tuo"

Prototipo vanilla HTML/CSS/JS, senza build e senza dipendenze.

| File | Ruolo |
|---|---|
| `art.js` | Renderer procedurali SVG degli ingredienti (placeholder) |
| `crea.js` | Motore dello stack (gravità, molle, squash & stretch), dati, UI, finale, share card |
| `crea.css` | UI con i token del brand Giggiooo |

## Metadati di un layer

Ogni renderer restituisce `{ h, top, below, svg }` in px logici, su una tela larga 420 (x da -210 a 210):

- **baseline (y = 0)**: centro della faccia superiore del layer sottostante
- **h**: spessore che il layer aggiunge allo stack
- **top / below**: estensione dell'art sopra e sotto la baseline (colature, sbordi)
- **`.melt`** (opzionale): gruppo che "fonde" (formaggi, salse)

## Passaggio agli sprite fotografici

1. **Set unico** per tutti gli ingredienti: stessa ottica, camera a circa 14° di elevazione (rapporto ellisse `K = 0.24`), key light calda in alto a sinistra, sfondo neutro per lo scontorno.
2. **Export** in PNG o WebP con alpha, a 840 px di larghezza (2×), centrati sull'asse verticale.
3. In `art.js` sostituire il renderer con un `<image href="sprite.webp">`, mantenendo `h`, `top` e `below` misurati sullo sprite.

Prezzi, kcal e allergeni in `crea.js` → `ING` sono dimostrativi.
