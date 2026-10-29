# Memole's World 0.1.1 — eliminare, archiviare e sistemare i dati

## Installa l'aggiornamento

Chiudi Memole's World, apri `Memoles-World-V0.1.1-Windows-x64-Setup.exe` e completa
l'installazione sopra la versione esistente. L'identità dell'app e la cartella
dati sono le stesse: l'aggiornamento non azzera l'archivio. Le nuove funzioni
vengono eseguite soltanto quando le scegli e le confermi.

## Bambini

Apri la scheda del bambino:

- **Modifica scheda** corregge anagrafica, tutori, scuola, classe e note.
- **Archivia** conserva la scheda e lo storico e sospende nuove rette automatiche.
  Per recuperarla, attiva “Mostra archiviati” nell'elenco e premi **Riattiva**.
- **Elimina bambino** rimuove la scheda e tutti i suoi accordi, rette e pagamenti.
  Il riepilogo mostra le quantità prima della conferma.

Puoi scegliere di eliminare anche i tutori che rimarrebbero senza bambini.
Un tutore condiviso con un fratello viene sempre conservato. Il diario delle
operazioni rimane consultabile; per svuotare anche il diario usa “Riparti da zero”.

## Genitori e tutori

Nella scheda del tutore trovi **Modifica contatto**, **Archivia/Riattiva** e
**Elimina**. Un tutore archiviato resta nelle schede già collegate, ma non si può
assegnare a un nuovo bambino finché non viene riattivato.

Se elimini l'unico tutore di un bambino, devi scegliere un **Tutore sostitutivo**.
I collegamenti vengono trasferiti insieme, senza duplicare il referente. Se non
hai altri tutori, aggiungine uno o elimina prima le schede dei bambini interessati.
Non vengono lasciate schede senza una persona di riferimento.

## Accordi, rette e pagamenti

- Nella scheda bambino, ogni accordo ha **Modifica**, **Elimina** e, se aperto,
  **Chiudi accordo**. La tariffa modificata vale per le prossime emissioni: le
  rette già emesse conservano l'importo, salvo correzione esplicita della retta.
- Tipo e data iniziale di un accordo restano fissi mentre esistono rette collegate.
  Per correggerli elimina prima le rette interessate, oppure chiudi l'accordo e
  creane uno nuovo. Gli intervalli degli accordi non possono sovrapporsi.
- Eliminare un accordo rimuove anche le sue rette e i pagamenti collegati,
  mantenendo bambino e tutori.
- In **Rette e pagamenti**, la **matita** corregge descrizione, scadenza e importo.
  L'importo non può scendere sotto quanto già ricevuto: sistema prima i pagamenti.
  Il **cestino** rimuove la retta e i suoi pagamenti.
- Una retta ricorrente eliminata può essere riproposta quando scegli nuovamente
  “Prepara rette”. Per interrompere le emissioni chiudi o elimina il suo accordo.
- In **Storico**, la **matita** corregge importo, data, metodo e nota di un pagamento
  valido. Il **cestino** lo rimuove dal registro e ricalcola il residuo.
- **Storna** conserva invece il pagamento visibile, con motivo e data dello storno.
  Un pagamento stornato si può eliminare, ma non modificare.

## Due modi di ricominciare

Vai in **Il tuo archivio → Metti ordine o ricomincia**:

| Comando | Rimuove | Conserva |
|---|---|---|
| Azzera solo rette e pagamenti | Tutte le rette e tutti i pagamenti | Bambini, tutori, accordi e diario |
| Riparti da zero | Bambini, tutori, accordi, rette, pagamenti e diario | Solo le copie di sicurezza separate |

Dopo “Riparti da zero” l'archivio resta vuoto anche chiudendo e riaprendo l'app.
Puoi iniziare a inserire le tue nuove schede: gli esempi non ricompaiono da soli.
L'azzeramento dei soli dati economici lascia invece disponibili gli accordi per
emettere nuovamente le rette quando decidi tu.

Per eliminare devi scrivere **ELIMINA**; per azzerare devi scrivere **AZZERA**.
Il pulsante resta disabilitato finché la parola non coincide. **Annulla** chiude
senza modifiche.

## Recuperare un errore

Prima di eliminazioni, correzioni economiche, azzeramenti e ripristini viene
salvata una copia completa dell'archivio. Se il salvataggio della copia fallisce,
l'operazione non prosegue.

In **Il tuo archivio → Punti di ripristino** trovi gli ultimi **5** stati precedenti,
con data, tipo di operazione e quantità di bambini, rette e pagamenti. Premi
**Ripristina**, controlla il riepilogo e conferma. Il ripristino sostituisce tutto
l'archivio corrente con quella copia e conserva a sua volta lo stato precedente.

Le copie sono sullo stesso dispositivo: non sostituiscono un backup esterno.
Continua a usare **Esporta backup** quando vuoi conservare una versione a lungo
termine o trasferirla. La sesta copia fa uscire dall'elenco la più vecchia.

## Compatibilità e recupero tecnico

La 0.1.1 legge gli archivi e i backup della 0.1.0. Nei vecchi dati, un tutore senza
campo `active` è considerato attivo. Dopo aver usato le nuove funzioni, continua
a usare la 0.1.1: la 0.1.0 non conosce il nuovo stato di archiviazione dei tutori.

File desktop, nella cartella dati già usata dall'app:

- `memoles-world.json`: archivio corrente.
- `memoles-world-recovery.json`: versione precedente all'ultima modifica.
- `memoles-world-safety.json`: contenitore `copies` degli ultimi 5 punti di ripristino.

Le copie contengono ancora i dati rimossi dall'archivio corrente: sono destinate
al recupero e restano separate dalle schede attive. L'azzeramento non cancella
backup esportati o copie di sicurezza.

Nell'anteprima di sviluppo la nuova chiave è `memoles-world:safety:v1`. I test UI
usano la porta locale **1431** e un archivio isolato dall'app Tauri e dalla normale
anteprima sulla porta 1420.

Lo schema Supabase della cartella `supabase/` è ancora quello iniziale, non attivo.
Le correzioni ed eliminazioni di questa versione sono implementate nell'archivio
locale; il futuro adapter cloud richiederà operazioni transazionali e RLS dedicate.
