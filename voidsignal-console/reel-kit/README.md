# Reel kit · VoidSignal

Reel in HTML con il design della **Scheda tribe ufficiale** della console (stessa geometria di `cardDefaults()`: media al 66 %, sfumatura 36–66 %, bagliore nel colore della tribe, categoria Inter Tight, titolo Anton, sottotitolo Instrument Serif corsivo, bordo e logo).
Il motore di rendering è la skill `reel-director` (HTML → Playwright → ffmpeg, deterministico, audio sintetizzato).

## Struttura

- `kit/reel-card.css` e `kit/reel-card.js`: il template (non si modificano per un singolo Reel).
- `reels/<nome>/config.js`: tribe, scene (immagine, titolo, sottotitolo, durata in frame, zoom) e chiusura con CTA.
- `reels/<nome>/index.html`: carica kit e configurazione, identico per ogni Reel.
- `assets/`, `fonts/`, `lib/`: logo, mockup prodotto, font originali e helper di animazione.

## Adattamenti rispetto alla scheda della console

- `lift` (default 230 px): i testi salgono per restare nell'area sicura; la UI di Instagram copre il bordo inferiore.
- `logoY` (default 255 px): il logo scende sotto la barra superiore.
- Il titolo usa lo stesso adattamento della console: si rimpicciolisce fino a metà del corpo, oltre va su due righe.
- Le scene cambiano a multipli di 15 frame (120 BPM) con stacco a tendina e testi che escono e rientrano a parole.

## Comandi (dalla cartella `reel-kit`)

```bash
E=<cartella skill reel-director>/engine
node $E/render.mjs reels/<nome>/index.html --stills auto --scale 0.4   # foglio di controllo
node $E/render.mjs reels/<nome>/index.html --verify 6                  # determinismo
node $E/render.mjs reels/<nome>/index.html --workers 2                 # master.mp4 + reel.mp4
```

`out/reel.mp4` è il file da pubblicare. Il Reel `test-the-stage` usa testi provvisori.
