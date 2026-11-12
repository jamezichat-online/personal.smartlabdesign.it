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

Il rack ufficiale è https://voidsignalbrand.com/#rack. Il catalogo viene aggiornato attraverso /api/catalog dalle fonti pubbliche del sito: catalogue.json, HTML, main.js e rail.js, senza eseguire il codice scaricato. Indicizza21 design all'ultima verifica, varianti per capo, viste front/back/detail, foto lookbook, anteprime, fotogrammi hero, spot e audio. Le viste detail sono crop del front, non immagini nuove. Le anteprime Drop02 non vengono inventate come prodotti acquistabili. In caso di fonte non disponibile, la console mostra un avviso e usa public/catalog-data.json come ultimo inventario verificato. I soli file software, i font e le texture procedurali non sono asset editoriali.
