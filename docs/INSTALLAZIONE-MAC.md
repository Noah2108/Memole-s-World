# Installare Memole's World sul MacBook di Hoara

Per **Apple M1, 8 GB, macOS Ventura 13.5**. Richiede macOS 13 o successivo e
contiene l'app ARM64: non occorrono Rosetta, Node, Rust o un browser.
Questa guida accompagna i pacchetti prodotti dalla build Mac; lo ZIP sorgenti
da solo non contiene un'app pronta.

## Installazione

1. Scarica l'artifact Mac dall'esecuzione GitHub Actions riuscita e decomprimilo.
2. Apri `Memoles-World-V0.1.3-macOS13-ARM64.dmg`.
3. Trascina **Memole's World** in **Applicazioni**. Se manca il collegamento nel
   DMG, apri Applicazioni nel Finder e trascinaci l'app.
4. Espelli il disco virtuale e apri l'app dalla cartella Applicazioni.
5. Per aggiungerla al Dock, trascinala lì da Applicazioni.

In alternativa, decomprimi `Memoles-World-V0.1.3-macOS13-ARM64.app.zip` nel
Finder e sposta la `.app` estratta in Applicazioni. Installa l'app prima di
aprirla e conserva una copia del pacchetto scaricato.

## Primo avvio e avvisi Apple

La build di collaudo ha firma **ad hoc**: non è firmata con Developer ID né
notarizzata da Apple. macOS può bloccarne l'apertura.

Dopo aver tentato l'apertura, vai in **Impostazioni di Sistema → Privacy e
sicurezza → Apri comunque**, poi conferma **Apri**, per questa app ottenuta
dalla tua build. Segui la [procedura ufficiale Apple](https://support.apple.com/en-us/102445).

Non disattivare Gatekeeper. Se compare un avviso di file danneggiato o malware,
controlla di aver scaricato la build corretta e conserva il messaggio per il
collaudo. Per la distribuzione con verifica Apple serve una build Developer ID
notarizzata, descritta nella guida tecnica.

L'app mostra **Bentornata Hoara**, la grafica Fusion Premium floreale e i dati
dimostrativi della versione Windows. I dati del PC non arrivano automaticamente.

## Portare i dati dal PC

1. Nell'app Windows apri **Il tuo archivio → Esporta backup** e salva il JSON.
2. Conservane una copia e trasferisci il file sul Mac.
3. Nell'app Mac apri **Il tuo archivio → Importa backup**, scegli il file,
   controlla l'anteprima e conferma.
4. Confronta bambini, tutori, rette, pagamenti e totali con il PC.
5. Esci con **⌘Q**, riapri e controlla che i dati siano rimasti.

Il ripristino sostituisce l'archivio sul Mac; non unisce i due archivi.
I successivi cambiamenti sui due computer sono indipendenti.
L'export conserva dati e storico, ma non i cinque punti di ripristino separati
che rimangono sul computer d'origine.

## Uso e aggiornamento

Il pulsante rosso e **⌘W** nascondono la finestra mantenendo l'app aperta:
clicca l'icona nel Dock per ritrovarla. **⌘Q** o **Memole's World → Esci**
terminano l'app. Salva il modulo aperto prima di uscire con ⌘Q.
L'app usa i menu nativi per copia/incolla e funziona offline.

Prima di sostituire l'app con una nuova versione, esporta un backup ed esci
con ⌘Q. Installa la nuova `.app` in Applicazioni. I dati sono conservati
separatamente e non vanno cancellati insieme all'app.

## Recupero in caso di errore dell'archivio

Se compare un errore di lettura, esci con ⌘Q. Nel Finder scegli **Vai → Vai alla
cartella…** e inserisci:

```text
~/Library/Application Support/world.memoles.desktop/
```

Prima di modificare alcunché, copia tutta la cartella in un luogo sicuro.
Contiene archivio corrente (`memoles-world.json`), stato precedente
(`memoles-world-recovery.json`) e punti di ripristino (`memoles-world-safety.json`).
Non sono database SQLite. Per recuperare lo stato precedente, conserva
l'archivio corrente con un altro nome, duplica il file recovery e assegna al
duplicato il nome `memoles-world.json`, poi riapri l'app. Se anche il recovery
non è leggibile, conserva tutti i file e richiedi assistenza.

Se riesci ad aprire l'app, preferisci il ripristino di un backup esportato o
un punto di ripristino disponibile in **Il tuo archivio**.
I file contengono dati non cifrati: conserva le copie con cura.

Prima della consegna completa la scheda [Collaudo Mac M1](COLLAUDO-MACOS-M1.md).
