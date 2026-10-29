# Memole's World 0.1.2 — collaudo Fusion Premium

Data: **24 ottobre 2026**, Windows x64.

| Verifica | Esito |
|---|---|
| Test automatici esistenti, 5 suite | **70 passati** |
| Flussi UI Chromium, inclusa gestione e recupero dati | **13 passati** |
| TypeScript e frontend di produzione | Compilati, codice 0 |
| Tauri release Windows + NSIS | Compilati, codice 0 |
| Versione eseguibile Windows | **0.1.2** |

## Controlli sull'interfaccia

Le sei sezioni sono state attraversate a **1440×900**, **1280×800** e **1060×720**.
Il test aggiunto verifica assenza di scorrimento orizzontale della pagina,
navigazione interamente visibile, collegamento “Apri le schede”, apertura e
chiusura del modulo bambino e disponibilità del pulsante Salva alla dimensione
minima desktop. I test di gestione della 0.1.1 sono stati rieseguiti insieme ai
quattro flussi originari.

Ispezionate visivamente le catture di panoramica, bambini, rette, archivio e modulo
di inserimento. Screenshot reali in `docs/screenshots/fusion-*.png`.

Le prove usano archivi browser isolati. Nessuna eliminazione, azzeramento o
sostituzione dell'archivio dell'utente è stata effettuata. Le API di persistenza
native continuano a essere coperte dai test con simulazioni descritti nel collaudo
0.1.1. In questo aggiornamento non sono stati modificati i moduli di dominio,
gestione dati o persistenza, né identificatore desktop e schema dell'archivio.

## Installer prodotto

`npm run desktop:build:windows` ha completato la compilazione Rust ottimizzata e
la creazione del pacchetto NSIS. Copia consegnata:

`deliverables/Memoles-World-V0.1.2-Windows-x64-Setup.exe`

- Dimensione: **2.430.504 byte**.
- SHA-256: `710748453F0BEA052AB41B90C7FCE0AAD6C3050E7B52656A6C8B1CBA796149E5`.
- Versioni file e prodotto dell'eseguibile: **0.1.2**.

La procedura guidata di installazione/aggiornamento non è stata automatizzata.
Non è stata aperta la nuova release sul vero archivio dell'utente. Il pacchetto
Windows non è firmato. Nessuna build o prova su macOS è stata eseguita:
`.app`, `.dmg`, firma e notarizzazione richiedono l'ambiente Mac indicato nella
guida dedicata. L'aspetto alle dimensioni MacBook è stato verificato con Chromium
su Windows, non con WebKit/macOS.
