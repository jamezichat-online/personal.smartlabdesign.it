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
