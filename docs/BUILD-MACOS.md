# Memole's World 0.1.3 — versione Mac M1

Adattamento del progetto Windows esistente del 24 ottobre 2026. Interfaccia
Fusion Premium con veste floreale, funzioni, icone, font, identificatore
`world.memoles.desktop` e formato dell'archivio sono riutilizzati.
Destinazione: **Apple M1 ARM64, 8 GB, macOS Ventura 13.5**. Minimo: **13.0**.

**Stato al 29 ottobre 2026:** sorgenti adattati e workflow predisposto; nessun
repository GitHub ancora disponibile, nessuna build macOS eseguita. I file `.app`
e `.dmg` non sono inclusi nello ZIP sorgenti. La prova sul Mac reale resta necessaria.

## Riscontro sui sorgenti

| Parte | Tecnologia effettiva |
|---|---|
| Interfaccia | React 19, TypeScript, Vite, CSS Fusion Premium/floreale |
| Desktop | Tauri 2; Rust tauri 2.12.5 nel lockfile, CLI JS 2.12.4 |
| Dati | JSON locale, tauri-plugin-store, validazione Zod |
| File e finestre di salvataggio | Plugin Tauri fs e dialog |
| Doppio avvio | Plugin single-instance e riapertura finestra |
| SQLite | **Non presente**; nessun `.db` o plugin SQL da migrare |
| Cloud | Non attivo; schema Supabase predisposto ma non usato |

`package-lock.json` e `src-tauri/Cargo.lock` fissano le dipendenze; non vengono
aggiornate per questo porting. Non ci sono eseguibili ausiliari Windows né SQLite
esterno. Font e immagini sono inclusi; Vite mantiene il target `safari16`/`es2021`.
Il prefisso WebKit per le sfocature conserva l'aspetto su Safari di Ventura.

## Compilare da Windows con GitHub Actions

1. Estrai `Memoles-World-V0.1.3-macos-arm64-sorgenti.zip` in una cartella dedicata.
   Lavora nella cartella che contiene `package.json` e `.github`.
2. Crea un repository GitHub, preferibilmente **privato**, e carica il contenuto
   conservando anche `.github`. Con GitHub Desktop puoi aggiungere la cartella,
   creare lì il repository se richiesto, confermare i sorgenti e scegliere
   **Publish repository**, mantenendo la visibilità privata. Archivi personali
   e certificati non fanno parte dello ZIP sorgenti.
3. Apri **Actions → Memole's World - Mac ARM64 → Run workflow**. Il workflow deve
   trovarsi sul ramo predefinito perché compaia il pulsante.
4. Attendi la conclusione. In caso di errore consulta il passaggio rosso;
   una build fallita non costituisce una consegna.
5. In **Artifacts** scarica `Memoles-World-macOS13-ARM64-<numero>`.

La configurazione `.github/workflows/macos-arm64.yml` usa avvio manuale, runner
Apple Silicon **macos-15**, Node **24.22.1**, Rust **1.99.1**, target
**aarch64-apple-darwin** e massimo due lavori Rust contemporanei.
La compilazione usa `npm ci` e Cargo `--locked`. Il runner macOS 15 può produrre
un'app con minimo 13.0; questo non prova il funzionamento su Ventura 13.5.
Disponibilità e consumi Actions dipendono dall'account/repository GitHub.

La pipeline esegue i test di logica, la build frontend e gli scenari UI WebKit,
poi compila `.app` e `.dmg`. `scripts/verify-macos.py` controlla identificatore,
versione, `LSMinimumSystemVersion`, ARM64, minimo Mach-O 13.0, integrità firma e DMG;
rifiuta collegamenti assoluti a librerie fuori dal sistema, come Homebrew.
La `.app` viene compressa con `ditto` per conservare permessi e metadati.
I pacchetti sono disponibili per 30 giorni: scaricali e conservali.
I report WebKit sono disponibili per 14 giorni.

File previsti nell'artifact:

```text
Memoles-World-V0.1.3-macOS13-ARM64.app.zip
Memoles-World-V0.1.3-macOS13-ARM64.dmg
INSTALLAZIONE-MAC.md
COLLAUDO-MACOS-M1.md
BUILD-MACOS.md
VERIFICA-BUILD.txt
SHA256SUMS.txt
```

La pipeline non pubblica release e non modifica l'installer Windows.
Se la build o i controlli falliscono, non carica l'artifact di consegna.
Playwright WebKit non è Safari 16.6 né la WKWebView di Ventura: il
[collaudo sul Mac reale](COLLAUDO-MACOS-M1.md) è un passaggio separato.

## Compilare direttamente su Mac

Per usare l'app già compilata non servono strumenti di sviluppo. Per compilarla:
Node 24.22.1, Rust 1.99.1 tramite rustup e Xcode Command Line Tools
(`xcode-select --install`). Python 3.9+ serve per verificare/confezionare.
La prima compilazione richiede Internet. Su 8 GB limita i lavori Rust a due.

Nel Terminale, dentro la cartella del progetto:

```sh
rustup toolchain install 1.99.1 --profile minimal
rustup override set 1.99.1
rustup target add aarch64-apple-darwin
npm ci
npm run doctor
npm run check
export CARGO_BUILD_JOBS=2
npm run desktop:build:mac
python3 scripts/verify-macos.py
```

`desktop:build:mac` richiede macOS e specifica sempre ARM64. Imposta
`MACOSX_DEPLOYMENT_TARGET=13.0` e usa firma **ad hoc**: non usare `--no-sign`.
Tauri carica `src-tauri/tauri.macos.conf.json` soltanto su macOS; finestra e
packaging Windows conservano la configurazione esistente.

Percorsi:

```text
src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Memole's World.app
src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/
deliverables/macos-arm64/
```

Per sviluppare: `npm run desktop:dev`. Per il test del solo frontend WebKit:
`npx --no-install playwright install webkit` e `npm run test:e2e:webkit`.
Le versioni recenti di Playwright possono richiedere un macOS più recente per il
loro browser di prova; su Ventura il collaudo va fatto nell'app nativa.

## Archivio e trasferimento Windows → Mac

La persistenza usa `appDataDir()` e `join()` Tauri: nessuna lettera di unità
Windows, separatore fisso o scrittura dentro `.app`, DMG o sorgenti.
Lo store risolve i nomi relativi nella stessa cartella dati dell'app.

| Sistema | Cartella dati |
|---|---|
| Windows | `%APPDATA%\world.memoles.desktop\` |
| macOS | `~/Library/Application Support/world.memoles.desktop/` |

File invariati: `memoles-world.json` (archivio), `memoles-world-recovery.json`
(stato precedente), `memoles-world-safety.json` (ultimi cinque punti di ripristino).
Lo store contiene una busta `{ "archive": ... }`; il JSON esportato dall'app
contiene lo stato direttamente. Non scambiarli rinominandoli.

Per il trasferimento usa **Il tuo archivio → Esporta backup** su Windows,
trasferisci quel JSON e usa **Importa backup** sul Mac. Controlla l'anteprima
prima di confermare il ripristino. Al primo avvio il Mac mostra dati demo.
L'import sostituisce l'archivio: non è fusione né sincronizzazione.
Le copie automatiche separate del PC non sono incluse nell'export.
Identificatore, schema e calcoli rimangono uguali. Conserva l'export prima di
ogni aggiornamento; l'installer Windows originale resta disponibile.

## Firma e notarizzazione

La pipeline usa `signingIdentity: "-"`: firma **ad hoc**, utile per collaudo
Apple Silicon, senza identità Apple verificata e senza notarizzazione.
Gatekeeper può richiedere **Privacy e sicurezza → Apri comunque**.
`codesign` verifica l'integrità della firma, non la fiducia Apple.

Per la distribuzione Developer ID servono iscrizione Apple Developer idonea,
certificato **Developer ID Application** con chiave privata nel Portachiavi
che compila e credenziali per la notarizzazione. Dopo aver installato il
certificato, imposta soltanto nell'ambiente di build:

- `APPLE_SIGNING_IDENTITY`: identità completa del certificato Developer ID.
- `APPLE_ID`: email dell'account Apple.
- `APPLE_PASSWORD`: password specifica per app, non quella ordinaria.
- `APPLE_TEAM_ID`: Team ID Apple.

`npm run desktop:build:mac` usa tale identità al posto di `-` e richiede le tre
credenziali di notarizzazione. Tauri gestisce invio e stapling; non usare
`--skip-stapling` per la consegna finale. Verificare sul Mac:

```sh
codesign --verify --deep --strict --verbose=2 "/Applications/Memole's World.app"
spctl --assess --type execute --verbose=4 "/Applications/Memole's World.app"
xcrun stapler validate "/Applications/Memole's World.app"
```

Per la build ad hoc `spctl` può rifiutare l'app e manca il ticket `stapler`:
sono limiti dichiarati della build di collaudo. Il workflow incluso rimane ad hoc;
per firmare su CI occorre configurare prima un Portachiavi temporaneo con il
certificato/chiave e le credenziali come GitHub Secrets. Non sono stati creati
certificati o account. Nessun segreto nei sorgenti o nelle variabili `VITE_*`.

## Riferimenti ufficiali verificati il 29 ottobre 2026

- [Versione minima e configurazione macOS Tauri](https://v2.tauri.app/reference/config/#macconfig).
- [Firma ad hoc, Developer ID e notarizzazione](https://v2.tauri.app/distribute/sign/macos/).
- [Pipeline Tauri su GitHub](https://v2.tauri.app/distribute/pipelines/github/).
- [Runner GitHub e architetture](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idruns-on).
- [Creazione DMG su CI](https://v2.tauri.app/distribute/dmg/): disposizione delle icone non garantita.
- [Apertura delle app secondo Apple](https://support.apple.com/en-us/102445).
- [WebKit in Playwright](https://playwright.dev/docs/browsers#webkit).
