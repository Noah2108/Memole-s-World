# Rapporto di collaudo V0.1

Data: **24 ottobre 2026**, ambiente Windows x64. Aggiornato dopo l'installazione
dei prerequisiti e la prima build nativa riuscita.

## Esiti verificati

| Verifica | Esito | Evidenza |
|---|---|---|
| Dominio economico, famiglie e integrità | PASS | 31 test in `src/domain.test.ts` |
| Repository, riapertura e fallimenti | PASS | 5 test in `src/persistence.test.ts` |
| Adattatore Tauri con API simulate | PASS | 4 test in `src/native-persistence.test.ts` |
| Configurazione Tauri e icone | PASS | 2 test in `src/desktop-config.test.ts` |
| TypeScript e build produzione frontend | PASS | `npm run build`, output reale in `dist/` |
| Flussi UI completi in Chromium | PASS | 4 scenari in `e2e/app.spec.ts` |
| Risorse/chiamate cloud nell'interfaccia provata | Nessuna | Asserzione di rete nello scenario dashboard |
| Layout | Controllato visivamente | Screenshot a 1440×900 e 1280×800 |
| Icone Windows/macOS | Generate e intestazioni verificate | `.ico`, `.icns`, PNG in `src-tauri/icons/` |

Totale suite automatica: **42 test passati**, più **4 scenari UI passati**.
Le API Tauri simulate verificano l'adattatore e non provano il funzionamento
effettivo del filesystem o dei dialoghi in un'app Tauri.

## Percorsi UI eseguiti

1. Dashboard demo: ottobre 2026, previsto 770,00 €, ricevuto 250,00 €, residuo
   520,00 €. Novembre inizialmente vuoto; emissione di 6 scadenze per 620,00 €;
   riapertura, emissione ripetuta senza duplicati, selezione mese/anno e assenza
   di errori JavaScript e richieste verso servizi esterni.
2. Nuovo bambino e nuovo tutore, mensile da 180,00 €, emissione, pagamento da
   200 € respinto, acconto 60,01 €, residuo 119,99 € dopo riapertura, storno
   motivato, export e ripristino del backup, residuo tornato a 180,00 €.
3. Scadenza personalizzata da 25,50 €, fratello collegato a un tutore esistente,
   archiviazione e import di backup non valido respinto senza sostituzioni.
4. Errore di scrittura simulato esplicito e nessun successo fittizio; riapertura
   con dati precedenti, JSON corrotto conservato e avvio bloccato senza reset.

## Build nativa Windows: riuscita

Il primo tentativo si era fermato per assenza di Cargo. Dopo l'installazione dei
componenti C++ di Visual Studio Build Tools 2026 e di Rust/Cargo 1.99.1 è stato
rieseguito `npm run desktop:build:windows`.

```text
Finished `release` profile [optimized]
Built application at: ...\src-tauri\target\release\memoles-world.exe
Finished 1 bundle at: ...\Memole's World_0.1.0_x64-setup.exe
```

La prima compilazione dell'eseguibile è riuscita; NSIS ha poi rilevato un errore
di quoting causato dall'apostrofo nel nome. È stato risolto con un hook circoscritto
alle macro dei collegamenti, in `src-tauri/windows/installer-hooks.nsh`, mantenendo
il nome Memole's World. Nessun calcolo o flusso del dominio è stato cambiato.
La successiva generazione dell'installer è riuscita e i due test di configurazione
desktop sono stati rieseguiti con successo.

File distribuibile verificato:
`deliverables/Memoles-World-V0.1-Windows-x64-Setup.exe`, **2.421.549 byte**.
SHA-256: `8EDF6E1F3E72862B57D8E4E1943FFEC230EB3F1BDAAAF44BBBF0B7FD5A1A6C77`.

Prove svolte sull'eseguibile **release** con controllo della finestra Windows:

- Avvio reale con icona, menu e interfaccia caricata da `http://tauri.localhost/`,
  senza server Vite.
- Caricamento dell'archivio demo e importi 770/250/520 €.
- Modifica e salvataggio della nota di un tutore demo dall'interfaccia.
- Verifica dei file effettivi in AppData: archivio principale revisione 5 con la
  nuova nota e copia precedente revisione 4 con la nota originale.
- Secondo avvio che riutilizza la stessa finestra (istanza singola).
- Chiusura completa, riapertura in un nuovo processo e caricamento dell'archivio.
- Apertura del dialogo nativo “Salva con nome”. La scrittura e il ripristino del
  backup tramite dialoghi nativi non sono dichiarati collaudati in questa sessione.

Non sono state eseguite installazione/disinstallazione NSIS, firma Windows,
notarizzazione o prove macOS. **`.app` e `.dmg` non sono stati compilati.**
Restano la prova completa dell'installer, backup/ripristino nativi, recupero da
guasto, WebKit macOS e firma/notarizzazione. L'installer Windows non è firmato.

## Cloud

Nessun Supabase remoto creato o contattato. Migrazione, RLS e suite SQL sono
predisposte, **non eseguite**: Supabase CLI e un database PostgreSQL locale
utilizzabile non sono stati rilevati. Auth, sincronizzazione e test di concorrenza
reali restano una tappa successiva. Nessuna credenziale è presente nel progetto.

## Riproduzione

```text
npm ci
npm run check
npm exec playwright -- install chromium
npm run test:e2e
```

Le prove UI avviano un server locale e un browser di test, con archivi isolati
dall'app desktop. In un ambiente sandbox devono essere consentiti processi del
browser e collegamenti al server loopback locale.

Versioni usate: Node 24.22.1, npm 11.19.1, React 19.3.1, TypeScript 7.0.2,
Vite 8.3.5, CLI Tauri 2.12.4, Vitest 5.0.5, Playwright 1.64.1.
Le dipendenze JavaScript sono bloccate in `package-lock.json`; quelle Rust ora
anche in `src-tauri/Cargo.lock`, generato dalla build riuscita. Runtime Rust Tauri
2.12.5 e toolchain Rust/Cargo 1.99.1.

## Schermate reali

- `screenshots/anteprima.png`: vista a 1280×800.
- `screenshots/panoramica-1440.png`: panoramica completa.
- `screenshots/panoramica-1280.png`: panoramica completa a larghezza MacBook.
- `screenshots/scheda-bambino.png`: scheda creata durante il test con acconto.
- `screenshots/rette-e-pagamenti.png`: tabella dopo una scadenza personalizzata.

Sono catture dell'interfaccia in browser di test su Windows, non fotografie
di una build nativa macOS o Windows.
