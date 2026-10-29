# Memole's World 0.1.3 — collaudo design floreale

**24 ottobre 2026 · Windows x64.** Tema applicato ai tre riferimenti dell'utente,
font incorporati e saluto iniziale “Bentornata Hoara”.

| Verifica | Risultato |
|---|---|
| Test automatici esistenti, 5 suite | **70 passati** |
| Flussi UI Chromium completi | **13 passati** |
| Percorso grafico rieseguito dopo l'ultima rifinitura | **Passato** |
| TypeScript e build frontend di produzione | Codice 0 |
| Tauri release Windows e installer NSIS definitivi | Codice 0 |
| Versione prodotto dell'eseguibile | **0.1.3** |
| Font locali caricati dal browser | Cormorant Garamond, Lora, Allura |
| Risorse pubbliche confrontate con dist | 5 font, 3 licenze, 2 illustrazioni identici |

## Prove visive e di utilizzo

Attraversate le sei sezioni a **1440×900**, **1280×800** e **1060×720**.
Verificati navigazione visibile, assenza di eccedenza orizzontale della pagina,
apertura/chiusura del modulo bambino e pulsante Salva accessibile nella finestra
minima. Ispezionate le catture di panoramica, schede, rette e modulo bambino.
Le immagini finali sono in `docs/screenshots/floreale-*.png`.

Il test grafico controlla il saluto, lo stato caricato delle tre famiglie di font,
il calendario di ottobre con le vere date delle rette demo, oggi evidenziato e
febbraio 2024 con 29 giorni. Il collegamento dal calendario apre le rette.
Il test iniziale continua a escludere richieste a host esterni durante l'uso.
Gli scenari precedenti verificano pagamenti, correzioni, rimozioni, azzeramento,
persistenza, fallimento delle scritture e recupero delle copie automatiche.

Il confronto SHA-256 con lo ZIP sorgenti 0.1.2 conferma che `domain.ts`,
`management.ts` e `persistence.ts` sono identici. Identificatore dell'app e schema
non sono cambiati. Nessuna operazione è stata eseguita sul vero archivio utente.

La suite completa è passata prima dell'ultima riduzione dell'area decorativa della
barra laterale. Dopo questa sola rifinitura CSS e l'esclusione delle cartelle di
build dal watcher di sviluppo, il percorso grafico è stato rieseguito con successo
e la release è stata ricompilata. Non è emerso alcun blocco dell'interfaccia.

## Pacchetto Windows consegnato

`deliverables/Memoles-World-V0.1.3-Windows-x64-Setup.exe`

- **7.629.010 byte**.
- SHA-256: `00D03268CAB4C5B3CA1E1E35D869E32B261B30F450589B47AA5863EC543D7F2D`.
- Versione prodotto verificata: **0.1.3**.
- Icone `.ico`, `.icns` e PNG rigenerate realmente dal monogramma botanico SVG.

Font e immagini sono copiati nella build; i file e i loro hash sono elencati in
`ASSET-MANIFEST-V0.1.3.json`. Licenze e font provengono dal repository ufficiale
Google Fonts; origine e prompt delle illustrazioni sono documentati separatamente.

## Limiti delle verifiche

La nuova release non è stata aperta sul vero archivio utente e la procedura guidata
di aggiornamento non è stata automatizzata. Le prove UI usano archivi browser
isolati; le API native di salvataggio restano coperte dalle simulazioni della suite
esistente. L'installer Windows non è firmato.

Nessuna compilazione `.app`/`.dmg`, prova WebKit/macOS, firma o notarizzazione è
stata eseguita. Questi passaggi richiedono un Mac e i requisiti indicati nella
[guida macOS](BUILD-MACOS.md). Le dimensioni MacBook sono simulate su Chromium
Windows. Il prototipo continua a usare dati demo locali, senza collegamenti cloud.
