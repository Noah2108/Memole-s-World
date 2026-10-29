# Memole's World — collaudo sul Mac reale

**Scheda predisposta, NON ancora eseguita.** MacBook Apple M1, 8 GB, Ventura 13.5.
Build su runner macOS 15 e Playwright su Windows non certificano questo dispositivo.

Data: __________ · Esecutore: __________ · Versione macOS: __________
Versione app: __________ · Esecuzione Actions/commit: __________
Firma (ad hoc / Developer ID notarizzata): __________
SHA-256 DMG: __________

Usare un archivio demo per le prove di azzeramento/recupero. Se sul Mac ci sono
già dati, esportare prima un backup e copiare la cartella dati ad app chiusa.
L'app Windows e il suo archivio restano sul PC.

| Prova | Risultato / note |
|---|---|
| Installazione DMG in Applicazioni, espulsione DMG, avvio | Da eseguire |
| Gatekeeper: messaggio e procedura di apertura effettiva | Da eseguire |
| Icona, titolo, menu, saluto e font locali | Da eseguire |
| Avvio offline senza browser esterno | Da eseguire |
| Display integrato a risoluzione predefinita, pulsanti raggiungibili | Da eseguire |
| Layout 1280×800 e minimo 1060×720, Retina, cambio mese/anno | Da eseguire |
| Tab, Maiusc+Tab, Esc, ⌘C, ⌘V, ⌘A e campi data/importi | Da eseguire |
| Pulsante rosso/⌘W e riapertura Dock: stesso modulo, una finestra | Da eseguire |
| Secondo avvio con finestra nascosta/minimizzata | Da eseguire |
| ⌘Q, nuovo avvio, nessuna seconda istanza | Da eseguire |
| Bambino/tutore, modifica, accordo settimanale/mensile/personalizzato | Da eseguire |
| Emissione rette, scadenze, calendario, blocco duplicati | Da eseguire |
| Acconto, saldo, importo eccessivo rifiutato, storno e totali | Da eseguire |
| Correzioni/rimozioni, archiviazione/riattivazione, fratelli | Da eseguire |
| Riavvio app e Mac: dati e totali conservati | Da eseguire |
| Export JSON in Documenti, nome con spazi e accenti | Da eseguire |
| Annulla salvataggio senza falso messaggio di successo | Da eseguire |
| Import Windows: anagrafiche/accordi/rette/pagamenti/storico uguali | Da eseguire |
| JSON malformato rifiutato senza modificare dati | Da eseguire |
| Azzeramento demo con copia automatica, ripristino completo | Da eseguire |
| Archivio corrotto: errore, nessuna sovrascrittura, recupero da copia | Da eseguire |
| Sostituzione `.app` a programma chiuso, dati conservati | Da eseguire |
| Monitoraggio Attività: memoria/CPU all'avvio e dopo 30 minuti | Da eseguire |
| Se notarizzata: codesign, spctl e stapler riusciti | Da eseguire |

Annotare memoria e reattività reali sugli 8 GB. Verificare richieste di accesso a
Documenti/Desktop durante export/import e comportamento se vengono negate.
In caso di errore conservare screenshot, messaggio, versione e passi riproducibili.

Esito finale: __________ · Problemi aperti: __________

La consegna è collaudata per Ventura 13.5 quando questa scheda è completata con
esiti verificati. Restano i limiti funzionali della V0.1.3 descritti nel README;
il porting non introduce sincronizzazione o nuove funzioni.
