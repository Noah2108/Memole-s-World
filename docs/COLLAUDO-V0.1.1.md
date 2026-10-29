# Memole's World 0.1.1 — collaudo gestione dati

Data: **24 ottobre 2026**, Windows x64. Estensione del collaudo iniziale in
`COLLAUDO.md`. Le eliminazioni e gli azzeramenti di prova sono stati eseguiti
su archivi isolati, senza operare sull'archivio dell'app installata.

## Esiti

| Suite | Esito |
|---|---|
| Dominio iniziale: date, denaro, accordi, emissioni e pagamenti | 31 test passati |
| Gestione dati: rimozioni, correzioni, tutori archiviati e azzeramenti | 22 test passati |
| Repository: revisioni, errori disco e copia obbligatoria | 7 test passati |
| Adattatore Tauri con API simulate: file, copie, rotazione e fallimenti | 8 test passati |
| Configurazione desktop e icone | 2 test passati |
| Totale test automatici | **70 passati** |
| Flussi UI Chromium Windows | **12 scenari passati** |
| TypeScript e compilazione frontend | Riusciti |
| Compilazione Tauri release e pacchetto NSIS | Riusciti |

I 42 test iniziali restano nella suite. Sono state aggiunte funzioni di gestione
separate, preservando il motore di calcolo esistente.

## Percorsi UI aggiunti

1. Eliminazione bambino annullata/confermata; parola errata non abilita il
   pulsante; tutore di un fratello conservato, rimozione coerente di rette/pagamenti.
2. Archiviazione e riattivazione tutore; eliminazione con trasferimento dei
   collegamenti a un sostituto, senza perdere la retta del bambino.
3. Eliminazione opzionale del tutore rimasto inutilizzato insieme al bambino.
4. Correzione retta respinta sotto l'importo già ricevuto; correzione valida,
   modifica pagamento, ricalcolo saldi, riapertura, eliminazioni e ripristino copia.
5. Modifica della tariffa dell'accordo per il futuro senza cambiare la retta emessa;
   tipo e inizio bloccati con rette collegate; eliminazione dell'accordo coerente.
6. Azzeramento dei soli dati economici, mantenimento di famiglie/accordi,
   riapertura e ripristino dell'archivio precedente dalla copia automatica.
7. Azzeramento totale anche del diario, archivio ancora vuoto dopo riapertura,
   creazione di una nuova famiglia e recupero degli esempi solo tramite ripristino
   esplicito della copia precedente.
8. Fallimento della copia di sicurezza simulato: azzeramento fermato, finestra
   aperta con errore e archivio originale conservato.

A questi si sommano i quattro percorsi originali. I test UI usano la porta 1431,
senza riutilizzare eventuali server di sviluppo sulla porta 1420.

## Copie e compatibilità

- Stato precedente salvato prima dell'operazione protetta, con revisione verificata.
- Massimo 5 copie in file separato, con stato completo validato.
- File corrotto o scrittura fallita: nessuna cancellazione del principale.
- Ultima versione prima di una normale modifica ancora in `memoles-world-recovery.json`.
- Vecchi backup senza `active` nel tutore accettati; il tutore è considerato attivo.
- Stesso identificatore Tauri `world.memoles.desktop`: l'aggiornamento non richiede
  azzeramento o spostamento dell'archivio.

Le prove dell'adattatore Tauri usano API simulate. Le nuove operazioni distruttive
non sono state eseguite tramite la finestra nativa sui dati dell'utente. La loro
copertura completa è nella suite di dominio e nei percorsi UI isolati.

## Artefatto Windows realmente prodotto

Comando: `npm run desktop:build:windows`, terminato con codice **0**.

```text
Finished `release` profile [optimized]
Built application at: ...\src-tauri\target\release\memoles-world.exe
Finished 1 bundle at: ...\Memole's World_0.1.1_x64-setup.exe
```

File: `deliverables/Memoles-World-V0.1.1-Windows-x64-Setup.exe`.
Dimensione: **2.425.787 byte**. Versione dell'eseguibile verificata: **0.1.1**.
SHA-256: `BDB1C3121F889C70D08A2C5D1CB3CB4153843BC03C8FFFE22148F35C88CFDF8F`.

Installer non firmato; procedura di installazione/aggiornamento/disinstallazione
non automatizzata in questo collaudo. Nessuna build `.app`/`.dmg` o notarizzazione
macOS eseguita. Supabase resta scollegato e la migrazione cloud iniziale non viene
modificata né dichiarata compatibile con le nuove cancellazioni locali.

## Ripetere le verifiche

```text
npm ci
npm run check
npm exec playwright -- install chromium
npm run test:e2e
npm run desktop:build:windows
```

Screenshot delle nuove schermate in `docs/screenshots/gestione-archivio-v011.png`
e `docs/screenshots/azzeramento-v011.png`.
