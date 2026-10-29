# Memole's World 0.1.3 — la veste floreale

Il design riprende i tre riferimenti forniti: rosa cipria e crema, accenti salvia
e lavanda, pannelli delicati, fiori ad acquerello, monogramma botanico e tipografia
elegante. All'apertura, sia durante il caricamento sia in panoramica, compare
**“Bentornata Hoara”**. Non occorre chiudere una schermata di benvenuto.

## Tipografia

Dalle immagini non si può accertare il font originale. Per avvicinarsi al loro
stile sono stati scelti:

- **Cormorant Garamond** per titoli, navigazione e importi.
- **Lora** per testi, campi e descrizioni.
- **Allura** per il nome dell'app e le piccole frasi calligrafiche.

I cinque file font sono inclusi in `public/fonts`, con le tre licenze SIL Open
Font License originali. Non occorre installarli su Windows o Mac; l'app li carica
localmente e non interroga Google Fonts durante l'uso.

Font e licenze provengono dal repository ufficiale Google Fonts:
[Cormorant Garamond](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond),
[Lora](https://github.com/google/fonts/tree/main/ofl/lora),
[Allura](https://github.com/google/fonts/tree/main/ofl/allura).

## Dashboard utilizzabile

Il panorama botanico è una decorazione; testo, pulsanti, importi e calendario
sono componenti reali dell'app. Il calendario mostra il mese selezionato e le
date delle rette effettivamente emesse. Il cerchio rosa indica oggi; i puntini
indicano una o più rette in scadenza. “Apri le rette del mese” porta all'elenco
del mese, ripulendo gli eventuali filtri precedenti.

Alle larghezze MacBook il calendario affianca la panoramica. Alla dimensione
minima desktop viene disposto sotto le schede, mantenendo i comandi accessibili.
Le operazioni su bambini, tutori, accordi e pagamenti restano disponibili.

## Aggiornamento Windows

1. Chiudi Memole's World.
2. Avvia `deliverables/Memoles-World-V0.1.3-Windows-x64-Setup.exe`.
3. Installa sopra la versione esistente e riapri l'app dal menu Start.

L'identificatore `world.memoles.desktop` e il formato dell'archivio sono invariati.
L'aggiornamento grafico non azzera i dati. Non serve estrarre i sorgenti.

## File e verifiche

- Tema attivo: `src/petals.css`; font locali: `src/typography.css`.
- Saluto e disposizione delle sezioni: `src/App.tsx`.
- Calendario delle rette: `src/DueCalendar.tsx`.
- Anteprime reali: `docs/screenshots/floreale-*.png`.
- Origine e prompt delle immagini: [asset botanici](ASSET-BOTANICI-V0.1.3.md).
- Esiti e limiti delle prove: [collaudo 0.1.3](COLLAUDO-V0.1.3.md).

Il tema precedente `src/fusion.css` è conservato nei sorgenti ma non viene caricato.
Dominio, gestione dati e persistenza non sono stati riscritti.
L'esperienza MacBook è stata controllata alle relative dimensioni su Windows;
la compilazione `.app`/`.dmg` e la prova WebKit richiedono ancora un Mac.
