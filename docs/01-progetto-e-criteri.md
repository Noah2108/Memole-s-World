# Memole's World V0.1 — contratto del primo modulo

## Obiettivo
Applicazione desktop Tauri 2, React, TypeScript, Vite. MacBook è il riferimento
di interazione e layout; Windows è la prima piattaforma di sviluppo. Nessuna
PWA, versione iPhone o credenziale inventata. Il primo modulo è “Famiglie e rette”.

## Passi verificabili
1. Definire entità, invarianti economiche e criteri di accettazione (questo file).
2. Implementare il dominio indipendente dall'interfaccia e verificarlo con test.
3. Collegare archivio persistente, schermate e flusso completo con dati demo.
4. Verificare build frontend e flussi UI. Verificare separatamente la build nativa.
5. Integrare Supabase Auth/RLS in un passo successivo, mantenendo i test del dominio.

## Modello e regole
- Tutore: nome, relazione, telefono, email, note; può essere collegato a più fratelli.
- Bambino: nome, cognome, nascita facoltativa, scuola/classe, tutori, note, stato attivo.
- Accordo: bambino, tipo (settimanale, mensile fisso, personalizzato), importo in
  centesimi, validità inclusiva, giorno di scadenza mensile 1–28. Non si sovrappone
  ad altri accordi dello stesso bambino. Si chiude e si aggiunge una nuova versione.
- Scadenza: fotografia dell'accordo e dell'importo al momento dell'emissione.
  Le modifiche successive non cambiano le scadenze emesse. Nessuna emissione nascosta.
- Settimanale: anticipo, ogni 7 giorni a partire dall'inizio dell'accordo. Una settimana
  a cavallo del mese appartiene al mese della sua data iniziale; 4 o 5 scadenze.
- Mensile: intero importo, senza riproporzionamento automatico, per ogni mese che
  interseca la validità. Scadenza al giorno pattuito oppure all'inizio se successivo.
- Personalizzato: singole scadenze inserite esplicitamente, importo modificabile.
- Emissione mensile ripetibile senza duplicati; non emette per bambini archiviati.
- Pagamento: collegato a una scadenza, data, metodo e importo positivo. Supporta
  acconti e saldo; non supera il residuo. Per saldare più scadenze si registrano più
  pagamenti. Nessun credito non allocato nella V0.1.
- Storno: conserva pagamento e motivo, lo esclude dai ricevuti e riapre il residuo.
- Nella 0.1.1, scadenze e pagamenti sono correggibili o eliminabili esplicitamente,
  con ricalcolo dei saldi e punto di ripristino automatico. Bambini e tutori si
  possono archiviare/riattivare o eliminare con gestione dei collegamenti.
- Previsto = scadenze emesse con scadenza nel mese; ricevuto = pagamenti validi
  allocati a quelle scadenze, anche se incassati in un altro mese; residuo = differenza.
  “Incassato nel mese” usa invece la data del pagamento. Non confondere le due viste.
- Storico locale delle operazioni. Non è un registro fiscale, né un audit inviolabile.
- Date civili YYYY-MM-DD, calcoli UTC senza conversioni di fuso; denaro in centesimi.

## Criteri di accettazione prima della consegna
- Creare e modificare bambino e tutore, collegare un tutore esistente a un fratello.
- Creare i tre accordi, rifiutare sovrapposizioni, chiudere senza cambiare lo storico.
- Emissione corretta a febbraio bisestile, confine anno, settimane a cavallo mese,
  date parziali e seconda emissione senza duplicati.
- Acconto + saldo; importi zero/negativi/non numerici e sovrapagamenti respinti.
- Storno motivato conserva lo storico e ricalcola i saldi; nessun doppio storno.
- Riapertura con gli stessi dati, backup esportabile e import validato/consapevole.
- Archivio corrotto o versione sconosciuta: errore esplicito, niente reset automatico.
- Errore di salvataggio: non presentare l'operazione come salvata.
- UI italiana accessibile da tastiera e comoda a 1280×800 e 1440×900.
- Nessuna chiamata cloud, nessuna chiave, permessi Tauri limitati al necessario.
- Distinguere test automatici, test UI, test nativi e build non eseguibili nell'ambiente.

## Estensione 0.1.1
Le specifiche e i nuovi criteri sono in `GESTIONE-ARCHIVIO.md`: rimozioni coerenti,
correzioni economiche, 5 copie di sicurezza, azzeramento selettivo o totale e
riapertura di un archivio vuoto senza reinserimento automatico dei dati demo.
I test iniziali restano parte della suite e continuano a passare.
