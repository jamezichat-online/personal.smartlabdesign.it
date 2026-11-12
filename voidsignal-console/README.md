# Void Signal — Editorial Console

Interfaccia su GitHub Pages all'indirizzo https://sites.smartlabdesign.it/voidsignal-console/.
Database D1 e API nel Cloudflare personale, senza dipendenze da Sites o dal login ChatGPT.

Il frontend è pubblico; tutti i dati editoriali e i risultati Metricool richiedono una sessione di 8 ore. La password è conservata solo come PBKDF2 salato. La prima configurazione richiede un token monouso (mai salvato nel repository); il proprietario imposta la propria password. CORS accetta solo l'origine del sito. Login limitato a 10 tentativi per IP ogni 15 minuti.

I sorgenti sono in source/. Per ricostruire, dalla cartella source: npm install, npm run build. Copiare public/app.js e public/app.css nella cartella superiore voidsignal-console/ insieme a index.html. Il servizio si aggiorna con npm run deploy:api dopo l'accesso al proprio Cloudflare. Non rigenerare o applicare schema.sql su un database esistente. Il secret BOOTSTRAP_HASH viene conservato da Cloudflare e non va incluso nel codice.

Il trasferimento Metricool avviene tramite i connettori autorizzati dell'automazione Codex: leggere i risultati reali e salvare una rilevazione nella tabella sync_runs con query parametrizzata. Non occorre esporre un endpoint pubblico di importazione, una chiave database o l'API Metricool a pagamento. Nessun dato privato viene salvato su GitHub.

Non contiene funzioni per pubblicare o programmare post Instagram. Il calendario è solo editoriale.

## Studio contenuti

Lo Studio produce PNG (post/storie), ZIP con PNG ordinate (caroselli) e video animati da immagini senza audio (reel). L'encoder dipende dal browser: MP4 quando supportato, altrimenti WebM con indicazione esplicita della conversione richiesta per Instagram. La registrazione video va tenuta in primo piano. Massimo 10 scene e 60 secondi per video.

ChatGPT Image è un flusso con intervento dell'utente: prompt e riferimento vengono preparati nello Studio, la generazione si esegue nel proprio account ChatGPT, e il file scaricato viene importato. Nessuna chiamata OpenAI API o utilizzo automatico dell'abbonamento dal sito.

I file importati sono conservati in IndexedDB solo nel browser del dispositivo. Sul Cloudflare vengono salvati progetto, testi e riferimenti ai file locali, non i file. Su un altro dispositivo occorre ricollegare le immagini. La cancellazione dei dati del browser elimina quelle copie locali: conservare sempre gli originali e gli export. Gli asset pubblici del brand sono letti tramite un endpoint autenticato, limitato a https://voidsignalbrand.com/assets/, con controllo formato e dimensione.

## Aggiornamento Studio e direzione IA

La sezione Proposte IA contiene proposte prodotte dall'assistente analizzando snapshot Metricool, con osservazioni, ipotesi, obiettivi e criteri di misura distinti. Le preferenze, le scelte e le richieste di produzione vengono salvate nel database. L'automazione Codex le legge nella prossima esecuzione; il sito non esegue chiamate AI istantanee né richiama direttamente l'abbonamento ChatGPT. La produzione ChatGPT Image usa il generatore incluso dell'assistente quando disponibile; i file rimangono sul dispositivo e vanno importati nello Studio.

Lo Studio accetta anche clip video locali (massimo250 MB), con inizio clip e durata scena. Il supporto codec dipende dal browser. Preview ed export compongono clip e immagini, mantenendo gli export senza audio; MP4 quando supportato dal browser, WebM altrimenti. Non viene garantita la conversione di codec che il browser non decodifica. Gli asset sono in IndexedDB, i progetti e i riferimenti ai file sono in D1.

Gli esperimenti hanno un cestino reversibile: l'endpoint autenticato /api/experiments/archive consente solo di archiviare o ripristinare record kind experiment. Non elimina dati definitivamente.

Il rack ufficiale è https://voidsignalbrand.com/#rack. Il catalogo viene aggiornato attraverso /api/catalog dalle fonti pubbliche del sito: catalogue.json, HTML, main.js e rail.js, senza eseguire il codice scaricato. Indicizza21 design all'ultima verifica, varianti per capo, viste front/back/detail, foto lookbook, anteprime, fotogrammi hero, spot e audio. Le viste detail sono crop del front, non immagini nuove. Le anteprime Drop02 non vengono inventate come prodotti acquistabili. Il risultato è conservato in D1 (tabella settings, chiave catalog-cache) per 6 ore: le aperture successive non interrogano il sito. Il pulsante «Aggiorna dal sito» forza il controllo; se il sito non risponde, il Worker restituisce l'ultimo catalogo valido (stale) e i guasti sono registrati con motivo, fonte e stato HTTP (502 per le fonti non raggiungibili, mai un generico 400). Il browser tiene una copia del catalogo in localStorage e lo richiede solo entrando in Asset & prodotti o nello Studio; catalog-data.json resta il fallback statico quando non esiste ancora alcuna copia. I soli file software, i font e le texture procedurali non sono asset editoriali.

## Preset Scheda tribe ufficiale

Preset ricavato dalla scheda mobile del sito ufficiale (senza fan di miniature e senza pulsante shop): Anton400 per il titolo, Instrument Serif400 Italic per il sottotitolo, Inter Tight500 per la categoria. I font originali sono inclusi in public/fonts/. Le dimensioni della scheda mobile sono normalizzate su1080px di export; cambiando rapporto si conserva la distanza del blocco testi dal fondo. Lo sfondo può essere immagine o clip. Palette ufficiale Stage #ff4a3d, Iron #e8e1cf, Grid #3fe6ea; testo bone #ece9f2, sottotitolo mist #cfcad8. Il bagliore e la sfumatura scura riprendono i valori sorgente. Testi, font, grandezze, pesi, colori, posizioni, spaziature, crop, sfumatura, bagliore e cornice sono modificabili e salvati nel progetto.

Il logo esportato è il PNG originale fornito dal proprietario (public/brand-logo.png), con trasparenza e proporzioni preservate. Non viene più ricostruito come scritta tipografica. Visibilità, dimensione e posizione sono regolabili.

## Efficienza di lettura (novembre 2026)

La lettura del workspace applica tetti per tipo (contenuti e asset 1000, esperimenti 300, proposte e richieste IA 60, preferenze 5) e un ETag: i controlli periodici ogni 5 minuti, eseguiti solo a scheda visibile, ricevono 304 senza rileggere i dati. «Esporta workspace» usa /api/console?all=1 e scarica sempre l'elenco completo. Gli asset del brand serviti da /api/asset sono nella cache privata del browser per 24 ore. Gli indici opzionali sono in backend/migrations/0002_indexes.sql (npm run migrate:indexes, idempotente).

Upload e download restano locali: nessun file lascia il dispositivo. La console richiede al browser l'archiviazione persistente (navigator.storage.persist) per ridurre il rischio che gli asset in IndexedDB vengano eliminati in caso di poco spazio; conservare comunque gli originali e gli export.

## Scheda tribe ufficiale: testi riposizionabili (novembre 2026)

- Nell'anteprima dello Studio, con il template «Scheda tribe ufficiale», categoria, titolo e sottotitolo si trascinano direttamente sul canvas; la maniglia in basso a destra del box selezionato li ridimensiona (titolo e categoria cambiano corpo e spaziatura, il sottotitolo corpo e larghezza del testo).
- Da tastiera: frecce per spostare (0,5 %, con Maiusc 2 %), `+` e `-` per ridimensionare, Esc per deselezionare.
- I valori restano quelli dei campi numerici già presenti (`titleX/Y`, `titleSize`, …): trascinamento e campi sono la stessa fonte di dati.
- Titolo adattivo (attivo di default, disattivabile in «Titolo»): se il testo supera la larghezza disponibile si rimpicciolisce fino a metà del corpo impostato, oltre va su due righe. Il disegno e i box di trascinamento usano lo stesso calcolo (`cardLayout` in `tribe-template.ts`), quindi export PNG/video e anteprima coincidono.
