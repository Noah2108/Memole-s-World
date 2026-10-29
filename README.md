# Memole's World · V0.1.3

Gestionale desktop per il doposcuola. Progetto reale **React + TypeScript + Vite +
Tauri 2**, con icona propria, finestra di sistema, menu nativi e packaging Windows
e macOS configurato. Il modulo “Famiglie e rette” funziona con dati dimostrativi
modificabili e persistenti. Non serve un account e non è configurato alcun cloud.

## Parti da qui

- **App Windows già compilata:** l'installer `Memoles-World-V0.1.3-Windows-x64-Setup.exe`
  è fornito separatamente dallo ZIP, nella cartella `deliverables` della consegna.
  Aprilo, completa l'installazione e avvia Memole's World dal menu Start. Lo ZIP
  contiene i sorgenti e non serve per l'uso quotidiano dell'app installata.
- **Windows:** apri [AVVIO-WINDOWS.md](AVVIO-WINDOWS.md).
- **Mac M1 (ARM64, Ventura 13.5):** segui [BUILD-MACOS.md](docs/BUILD-MACOS.md).
  Il porting del 29 ottobre riusa questo progetto e include il workflow GitHub
  Actions per generare `.app` e `.dmg`, con minimo macOS 13.0 e firma ad hoc.
  **La build macOS non è ancora stata eseguita:** manca il repository GitHub.
  Sono incluse [installazione e recupero](docs/INSTALLAZIONE-MAC.md) e la
  [scheda di collaudo Mac reale](docs/COLLAUDO-MACOS-M1.md).
  Dettagli e limiti: [verifica del porting](docs/PORTING-MACOS-2026-10-29.md).
- **Nuovo design floreale e font:** [veste 0.1.3 e saluto Bentornata Hoara](docs/DESIGN-FLOREALE.md).
- **Cosa è stato davvero verificato:** [collaudo 0.1.3](docs/COLLAUDO-V0.1.3.md),
  [precedente veste 0.1.2](docs/COLLAUDO-V0.1.2.md),
  [gestione dati 0.1.1](docs/COLLAUDO-V0.1.1.md),
  [collaudo iniziale](docs/COLLAUDO.md).
- **Regole economiche e criteri:** [contratto del modulo](docs/01-progetto-e-criteri.md).
- **Schema e passaggi successivi:** [architettura](docs/02-architettura.md).
- **Nuove funzioni 0.1.1:** [eliminazioni, correzioni e azzeramento](docs/GESTIONE-ARCHIVIO.md).

## Cosa puoi usare

- Saluto iniziale “Bentornata Hoara”, tema floreale e font inclusi anche offline.
- Calendario del mese con le scadenze delle rette effettivamente emesse.

- Dashboard mensile: previsto, ricevuto, residuo, incassi datati nel mese e scaduti.
- Schede bambini con scuola, classe, nascita facoltativa, note e archiviazione.
- Genitori/tutori modificabili e condivisibili tra fratelli.
- Accordi distinti per ogni bambino: settimanale, mensile fisso, personalizzato.
- Emissione esplicita delle rette, con anteprima e protezione dai duplicati.
- Scadenze personalizzate, acconti e saldi con data, metodo e note.
- Storni motivati e storico locale conservato.
- Archiviazione/riattivazione dei tutori e rimozione di bambini e tutori con gestione dei collegamenti.
- Correzione o eliminazione di accordi, rette e pagamenti con ricalcolo dei saldi.
- Azzeramento dei soli dati economici oppure archivio completamente vuoto.
- Ultimi 5 punti di ripristino automatici, consultabili e recuperabili dall'app.
- Salvataggio a ogni operazione, copia precedente separata, export/import JSON.

Le rette mensili e settimanali sono intere, senza pro-rata automatico. Il settimanale
scade ogni 7 giorni dalla data iniziale. Un pagamento salda una sola scadenza; per
più scadenze si registrano più movimenti. Non sono previsti crediti non allocati.

## Stato della consegna del 24 ottobre 2026

**Verificati:** 70 test automatici, 13 scenari UI Chromium su Windows, compilazione
frontend e icone `.ico`/`.icns`/PNG. Screenshot reali in `docs/screenshots/`.

**Windows compilato:** eseguibile release e installer NSIS `.exe` creati con successo.
Verificati avvio della finestra Tauri, salvataggio reale in AppData, copia precedente,
riapertura e singola istanza. L'installer è stato prodotto ma la sua procedura di
installazione/disinstallazione non è ancora stata collaudata. La build non è firmata.

**Mac non compilato:** `.app` e `.dmg` richiedono una build e una prova su Mac.

**Predisposto, non attivato:** schema PostgreSQL/Supabase, RLS, trigger e test SQL
nella cartella `supabase/`. Auth e sincronizzazione non sono implementati nella V0.1.

## Comandi di sviluppo

```text
npm ci
npm run doctor
npm run check
npm run desktop:dev
```

Con gli strumenti nativi installati, `desktop:dev` apre una finestra Tauri con icona
app; Vite è soltanto il server interno di sviluppo. La build distribuita incorpora
l'interfaccia, non richiede Vite/Node né una finestra del browser.

```text
npm run desktop:build:windows
npm run desktop:build:mac
```

I comandi di compilazione vanno eseguiti sul rispettivo sistema. Il comando Mac
seleziona esplicitamente ARM64; in alternativa esegui il workflow incluso su
GitHub Actions. Le istruzioni di firma e notarizzazione sono nella guida dedicata.

Per il solo collaudo frontend: `npm run dev` (anteprima locale di sviluppo, archivio
del browser separato dall'app). Non è il prodotto da consegnare a Hoara.

## Limiti intenzionali del prototipo

Usare solo dati demo: archivio JSON locale non cifrato, backup manuali e audit locale
modificabile. Non è ancora uno strumento fiscale o un sistema pronto per dati reali
di minori. Prima dell'uso reale vanno completati accessi, controlli cloud, backup e
recupero, gestione della riservatezza e test sui dispositivi destinatari.

Nessuna password, progetto Supabase, service role o certificato viene inventato.
`.env.example` contiene solo campi vuoti e non abilita connessioni.

![Panoramica floreale](docs/screenshots/floreale-panoramica-1440.png)
