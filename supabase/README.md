# Integrazione cloud futura

La V0.1 NON usa questo database: nessun account remoto, migrazione eseguita o
accesso Supabase è stato creato. La cartella contiene uno schema PostgreSQL
iniziale e una suite pgTAP da eseguire in un ambiente Supabase locale di test.
Non applicare direttamente a un database con dati reali.

Le nuove correzioni/eliminazioni e copie di ripristino della 0.1.1 funzionano
nell'archivio locale. Questa migrazione conserva i vincoli iniziali append-only:
prima del cloud serviranno RPC transazionali autorizzate per le nuove operazioni,
archiviazione tutori e politiche di recupero. Non allentare i grant/RLS per imitare
le cancellazioni locali dal client.

## Modello
Un account Supabase Auth è proprietario del suo archivio (`owner_id`). Tutte le
tabelle hanno RLS e nessun accesso anonimo. Le FK includono il proprietario:
un bambino non può puntare a tutori, accordi o scadenze appartenenti a un altro
account. Gli accordi non si sovrappongono, le scadenze hanno una chiave di emissione
univoca, i pagamenti possono solo essere stornati. Nessun DELETE sullo storico.

Lo schema è predisposto per un singolo gestore per archivio. La condivisione tra
più operatori richiederà organizzazioni, membri e politiche dedicate.

## Verifica successiva (non svolta in questo ambiente)
1. Installare Supabase CLI e Docker e inizializzare un progetto LOCALE di prova.
2. Applicare la migrazione in questa cartella al solo database di prova.
3. Eseguire `supabase test db` per la suite in `tests/`.
4. Aggiungere un test concorrente con due transazioni sulla stessa scadenza:
   il totale pagato non deve mai eccedere il dovuto. Il trigger usa un advisory
   lock per scadenza, senza concedere UPDATE sulle scadenze al client.
5. Verificare CRUD consentito/negato per ogni tabella, owner_id non alterabile,
   token scaduto/anonimo, edge case sulle date e migrazione dei backup locali.
6. Implementare adapter cloud e Auth, recupero sessione, logout, errori di rete,
   sincronizzazione e conflitti; conservare la suite del dominio locale.

Il client userà soltanto URL di progetto e publishable key pubblica. Nessuna
service role / secret key nel frontend. Le sole variabili vuote di `.env.example`
non attivano il cloud e non costituiscono un'integrazione implementata.

La suite iniziale verifica isolamento e principali regole economiche, ma non è
ancora una certificazione di sicurezza o una copertura completa. Il cloud non va
attivato prima della verifica effettiva di migrazione, RLS e concorrenza.

Riferimento: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
