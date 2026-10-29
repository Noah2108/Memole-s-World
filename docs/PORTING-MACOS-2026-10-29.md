# Memole's World — verifica del porting macOS

**29 ottobre 2026.** Adattamento della V0.1.3 esistente, senza ricostruzione del
gestionale e senza conversione del formato dati.

## Riscontri e modifiche

- Framework rilevato nei manifest: React/TypeScript/Vite con Tauri 2.
- Archivio effettivo: JSON e plugin store; SQLite non è presente.
- Calcoli, gestione e persistenza conservati identici ai sorgenti Windows 0.1.3.
- Identificatore `world.memoles.desktop` conservato; percorsi risolti tramite Tauri.
- Nessuna modifica a package-lock/Cargo.lock, font, immagini o icona `.icns`.
- Configurazione specifica Mac con minimo 13.0, firma ad hoc, `.app`/`.dmg` e
  finestra iniziale 1280×760, minimo 1060×720.
- Chiusura finestra su Mac: mantiene la webview nascosta; il Dock la riapre.
  Menu nativi mantenuti e uscita tramite ⌘Q. Codice specifico protetto da
  `cfg(target_os = "macos")`.
- Sfocature con prefisso WebKit, senza cambiare stile Fusion Premium/floreale.
- Comando Mac con target ARM64 esplicito, deployment target 13.0 e Cargo bloccato.
- Workflow manuale su runner `macos-15` ARM64, test WebKit e verifica del bundle.
- Verifica del Mach-O, plist, firma e DMG; compressione app con `ditto`, checksum
  dei file consegnati e guide incluse nell'artifact.
- Rust minimo dichiarato corretto da 1.77.2 a 1.90, richiesto dal Tauri già fissato
  nel lockfile; la toolchain CI è 1.99.1, uguale a quella disponibile su questo PC.

## Controlli eseguiti su Windows

| Controllo | Esito |
|---|---|
| Test automatici, incluse copie e trasferimento Windows → Mac simulato | 73 passati |
| TypeScript e build frontend di produzione | Riusciti |
| `cargo check --locked --offline` Windows | Riuscito |
| Formattazione Rust e sintassi script Node/Python | Valide |
| Schema Tauri della configurazione Mac dopo fusione | Valido |
| Sintassi YAML del workflow | Valida |
| Lockfile: pacchetti nativi Darwin ARM64 per CLI, Vite e TypeScript | Presenti |
| Scenari UI Chromium su Windows | 13 passati |
| Scenari UI WebKit su Windows | 13 passati |
| Ispezione immagini WebKit: panoramica e modulo a 1280×800 | Grafica conservata, nessun taglio del modulo |
| Confronto archivio, calcoli e risorse con ZIP Windows originale | Identici |
| SHA-256 installer Windows originale | Invariato |

I test dei percorsi filesystem sono simulazioni delle API native, con nomi utente
contenenti spazi/accenti e separatori Windows/macOS. Non sono prove su disco Mac.
Le immagini dei nuovi test restano in cartelle separate per scenario/browser;
gli screenshot della consegna Windows non vengono sovrascritti.

Prove visive **WebKit su Windows, non schermate dell'app macOS**:
[panoramica](screenshots/porting-webkit-windows-panoramica-1280.png) e
[modulo](screenshots/porting-webkit-windows-finestra-1280.png).
I 26 scenari completi sono passati in un'unica esecuzione di 3,2 minuti.
Per scaricare i browser sono stati usati i certificati di sistema del PC,
mantenendo attiva la verifica TLS. I test hanno usato archivi demo isolati.

Installer conservato: `Memoles-World-V0.1.3-Windows-x64-Setup.exe`, 7.629.010 byte.
SHA-256: `00D03268CAB4C5B3CA1E1E35D869E32B261B30F450589B47AA5863EC543D7F2D`.
Lo ZIP sorgenti originale Windows 0.1.3 viene conservato separatamente.

## Passaggi ancora da eseguire

Non esiste ancora un repository GitHub del progetto. Da questo host Windows
non sono state prodotte `.app`/`.dmg`: la pipeline è predisposta, non eseguita.
Non sono state compilate né provate le sezioni Rust specifiche macOS.
La build effettiva e i controlli Apple richiedono il runner macOS o un Mac.

La firma prevista per la pipeline è ad hoc; Developer ID e notarizzazione non
sono configurati e non sono state create credenziali Apple. La compatibilità
effettiva e il consumo di memoria su M1/8 GB/Ventura 13.5 restano da misurare
con la [scheda Mac reale](COLLAUDO-MACOS-M1.md).

Il [percorso di build](BUILD-MACOS.md) e la [guida di installazione](INSTALLAZIONE-MAC.md)
spiegano come produrre i pacchetti, trasferire i dati e recuperare l'archivio.
