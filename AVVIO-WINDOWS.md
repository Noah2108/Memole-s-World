# Memole's World — prova su Windows

## Per usare subito l'app

1. Chiudi l'app e apri `deliverables\Memoles-World-V0.1.3-Windows-x64-Setup.exe` con doppio clic.
2. Completa l'installazione guidata.
3. Dal menu Start cerca **Memole's World** e apri l'app con la sua icona.

Lo ZIP `Memoles-World-V0.1.3-sorgenti.zip` contiene il progetto di sviluppo:
non serve estrarlo per utilizzare l'app installata. Non serve avviare un server
o tenere aperto un terminale. Sul PC sono già presenti WebView2 e gli strumenti
di sviluppo. La versione 0.1.3 include il design floreale e i font ispirati ai riferimenti,
con il saluto iniziale “Bentornata Hoara”.
Il salvataggio nativo è stato verificato nella versione iniziale; i flussi della
0.1.3 sono stati ricollaudati in un archivio frontend isolato. La procedura guidata
dell'installer non è stata automatizzata.

Le sezioni seguenti servono per sviluppare o ricompilare il progetto.

L'aggiornamento conserva l'archivio attuale. Per rimozioni, correzioni, azzeramento
e recupero dall'app leggi [Gestione archivio 0.1.1](docs/GESTIONE-ARCHIVIO.md).

## Situazione di questo computer

Controllo aggiornato del 24 ottobre 2026: Node.js 24.22.1, npm 11.19.1,
WebView2 155.0.4283.62, Rust/Cargo 1.99.1 e Visual Studio Build Tools 2026 con
componenti C++ presenti. Le dipendenze sono installate. **La build Windows release
e l'installer `.exe` sono stati prodotti con successo.**

## 1. Strumenti per ricompilare su un altro computer (una sola volta)

1. Installa [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
   Nell'installer seleziona **Sviluppo desktop con C++**, con MSVC x64/x86 e Windows
   SDK. Mantieni i componenti consigliati per questa opzione.
2. Installa [Rust con rustup](https://rustup.rs/), scegliendo il toolchain predefinito
   **MSVC**. In alternativa, da PowerShell: `winget install --id Rustlang.Rustup --exact`.
3. Chiudi e riapri PowerShell dopo l'installazione. Riavvia il PC se richiesto
   dall'installer. Non serve cambiare policy di PowerShell o disattivare TLS.

WebView2 è già presente qui. Su un altro computer controlla anche
[WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/).
Per i requisiti ufficiali: [Tauri per Windows](https://v2.tauri.app/start/prerequisites/#windows).

## 2. Apri la cartella del progetto

Da PowerShell, copia questa riga intera (le virgolette servono per gli spazi):

```powershell
Set-Location -LiteralPath "C:\Users\noahm\Documents\ChatGPT\Hoara Doposcuola"
```

Se hai estratto lo ZIP altrove, usa invece il percorso della cartella estratta
che contiene `package.json`.

## 3. Avvia il controllo e l'app desktop

Su questo computer le dipendenze sono già presenti. Su una nuova copia esegui
prima `npm.cmd ci`. Poi:

```powershell
npm.cmd run doctor
npm.cmd run tauri info
npm.cmd run desktop:dev
```

Attendi la prima compilazione Rust: può richiedere diversi minuti e scarica i
pacchetti. Quando riesce si apre **Memole's World**, una finestra desktop con icona
app e menu di sistema. Lascia aperta la finestra del terminale durante la prova.
Per fermare lo sviluppo, chiudi l'app e premi Ctrl+C nel terminale.

Dopo aver installato gli strumenti puoi anche fare doppio clic su
**Avvia Memole's World.cmd**: esegue gli stessi controlli e avvia Tauri. È un
avviatore per lo sviluppo, non l'installer finale da regalare a Hoara.

Se `doctor` segnala uno strumento mancante, correggi quel punto prima di continuare.
Se `npm` segnala il blocco di uno script PowerShell, usa sempre `npm.cmd` come sopra.

In questo ambiente npm ha richiesto i certificati di sistema Windows. Solo se
compare `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, con Node recente puoi riprovare nella
sessione corrente con `$env:NODE_USE_SYSTEM_CA = '1'` e poi `npm.cmd ci`.
Non usare `strict-ssl=false` né disabilitare la verifica dei certificati.

## 4. Prova il primo modulo (circa 5 minuti)

1. In Panoramica verifica le quattro schede demo e gli importi del mese corrente.
2. In **Bambini → Nuovo bambino**, usa un nome di fantasia e crea il tutore.
3. Apri la scheda, **Accordi economici → Aggiungi**. Scegli “Mensile fisso”,
   inserisci 180,00 € e l'inizio del mese corrente.
4. Nella scheda premi **Prepara rette**, controlla l'anteprima e conferma.
5. Sulla retta usa la freccia per registrare 60,00 €. Il residuo deve essere 120,00 €.
6. Chiudi e riapri l'app: i dati devono esserci ancora. Il mese iniziale torna a quello
   corrente; per altri periodi usa il selettore in alto.
7. In **Storico**, trova il pagamento, premi **Storna** e inserisci un motivo.
   Il movimento resta visibile e il residuo torna a 180,00 €.
8. In **Il tuo archivio**, esporta un backup JSON. Per provare il ripristino,
   seleziona quel file, verifica il riepilogo e conferma la sostituzione.

Per un settimanale, scegli una data iniziale e un importo per settimana: verranno
create scadenze ogni 7 giorni. Per un personalizzato crea prima l'accordo nella
scheda, poi premi **Scadenza** per ogni importo dovuto.

Non cambiare un accordo già emesso: chiudilo con data almeno pari all'ultimo
periodo emesso, poi aggiungine uno nuovo dal giorno successivo. Lo storico resta
intatto. Gli accordi non possono sovrapporsi.

## 5. Crea l'installer `.exe`

Dopo una prova desktop riuscita:

```powershell
npm.cmd run check
npm.cmd run desktop:build:windows
```

Solo se il secondo comando termina con successo troverai:

- l'eseguibile dell'app in `src-tauri\target\release\memoles-world.exe`;
- l'installer NSIS `.exe` in `src-tauri\target\release\bundle\nsis\`.

L'installer crea una vera applicazione Windows con l'icona dedicata e una voce
nel menu Start. Non è un collegamento a un sito. La build corrente non configura
una firma Windows; per distribuire il prodotto pubblicamente servirà valutare
anche un certificato di firma del codice.

## Dove sono i dati e come recuperarli

Nell'app Tauri i file sono nella cartella dati dell'app:

```text
%APPDATA%\world.memoles.desktop\memoles-world.json
%APPDATA%\world.memoles.desktop\memoles-world-recovery.json
```

Il primo contiene l'archivio attuale, il secondo la versione precedente a una
modifica. Entrambi hanno un contenitore JSON con campo `archive`. Il backup
esportato dall'interfaccia contiene invece direttamente l'archivio, senza contenitore.

Se l'app segnala un archivio illeggibile:

1. Chiudi completamente Memole's World.
2. Fai una copia di **entrambi** i file in un'altra cartella.
3. Se hai un backup esportato, conserva il file principale con un altro nome e
   riapri l'app: avrà un nuovo archivio demo. Da “Il tuo archivio” importa il backup.
4. Se hai solo la copia di recupero, dopo aver preservato i due originali copia
   `memoles-world-recovery.json` al posto di `memoles-world.json`, poi riapri l'app.
5. Se anche quella copia è danneggiata, non sovrascrivere gli originali: servirà
   esaminarli. Non c'è un reset automatico all'avvio.

L'anteprima `npm.cmd run dev` usa invece l'archivio del browser per
`http://127.0.0.1:1420`, con chiavi `memoles-world:v1` e
`memoles-world:recovery:v1`. È separato dall'app: per trasferire le prove usa
export/import JSON. Per il recupero tecnico del browser va conservato il valore
grezzo prima di ripristinare dalla chiave di recupero. Non cancellare i dati del
browser se non hai esportato ciò che vuoi conservare.

## Test ripetibili

```powershell
npm.cmd run check
npm.cmd exec playwright -- install chromium
npm.cmd run test:e2e
```

I test UI usano un archivio del browser isolato e non modificano l'archivio desktop.
Non sostituiscono la prova Tauri descritta sopra.
