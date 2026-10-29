# Memole's World 0.1.2 — Fusion Premium

Nuova veste grafica del 24 ottobre 2026. Il nome dell'app resta **Memole's World**.
Fusion Premium indica lo stile visivo applicato al progetto, senza servizi a
pagamento, dipendenze aggiuntive o risorse caricate da siti esterni.

## Cosa cambia

- Navigazione verde bosco con sfumature, selezione avorio e un piccolo accento oro.
- Sfondo avorio, salvia e lavanda; pannelli con bordi morbidi e ombre leggere.
- Gerarchia dei testi più chiara, descrizioni contestuali e moduli più leggibili.
- Dashboard con illustrazione vettoriale, conteggio reale dei bambini attivi e
  collegamento diretto alle schede.
- Schede bambini, tutori, tabelle, storico, archivio e finestre aggiornati insieme.
- Rispetto delle preferenze di movimento e trasparenza ridotti, dove supportate.

## Installazione Windows

Chiudi Memole's World e avvia
`deliverables/Memoles-World-V0.1.2-Windows-x64-Setup.exe`.
Completa l'installazione sopra quella esistente e apri l'app dal menu Start.
Non serve estrarre lo ZIP dei sorgenti né avviare Visual Studio o Rust.

L'identificatore dell'app e il formato dell'archivio rimangono uguali. Questa
versione non migra, azzera o sostituisce l'archivio esistente.
Modifica, archiviazione, eliminazione, azzeramento e punti di ripristino restano
disponibili come descritto in [Gestione archivio](GESTIONE-ARCHIVIO.md).

## Manutenzione

Lo stile è raccolto in `src/fusion.css`, importato dopo lo stile di base.
Titoli contestuali e collegamento alle schede sono in `src/App.tsx`.
I moduli `domain.ts`, `management.ts` e `persistence.ts` non sono stati cambiati.
È quindi possibile evolvere ancora l'aspetto senza riscrivere calcoli o salvataggi.

Le anteprime in `docs/screenshots/fusion-*.png` sono catture del frontend di prova
con dati dimostrativi, non immagini simulate e non prove della versione macOS.
Per `.app` e `.dmg`, firma e notarizzazione resta necessaria la procedura su Mac
descritta in [Build macOS](BUILD-MACOS.md).
