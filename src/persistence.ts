import { isTauri } from '@tauri-apps/api/core';
import { z } from 'zod';
import { now, stateSchema, uuid, type State } from './domain';

export const STORAGE_KEY = 'memoles-world:v1';
export const RECOVERY_KEY = 'memoles-world:recovery:v1';
export const SAFETY_KEY = 'memoles-world:safety:v1';
const safetySchema = z.array(z.object({ id: z.string().uuid(), createdAt: z.iso.datetime(), label: z.string().min(1).max(200), state: stateSchema }).strict()).max(5);
export type SafetyCopy = z.infer<typeof safetySchema>[number];
function parseCopies(raw: unknown): SafetyCopy[] {
  const result = safetySchema.safeParse(raw);
  if (!result.success) throw new Error('Le copie di sicurezza non sono leggibili. Nessun dato è stato eliminato. Conserva i file e consulta la guida di recupero.');
  return result.data;
}
function withCopy(copies: SafetyCopy[], state: State, label: string): SafetyCopy[] {
  return parseCopies([...copies.slice(-4), { id: uuid(), createdAt: now(), label, state }]);
}
export interface Driver {
  read(): Promise<unknown | null>;
  write(value: State): Promise<void>;
  backup(value: State): Promise<void>;
  preserve?(value: State, label: string): Promise<void>;
  preserved?(): Promise<unknown>;
}

export class Repository {
  constructor(private readonly driver: Driver) {}
  async load(): Promise<State | null> {
    const raw = await this.driver.read();
    if (raw === null) return null;
    const result = stateSchema.safeParse(raw);
    if (!result.success) throw new Error('Archivio non leggibile o versione non supportata. I dati non sono stati sostituiti. Consulta le istruzioni di recupero.');
    return result.data;
  }
  async save(next: State, expectedRevision: number | null, safetyLabel?: string): Promise<void> {
    stateSchema.parse(next);
    const previous = await this.load();
    if ((previous?.revision ?? null) !== expectedRevision) throw new Error('L’archivio è cambiato in un’altra finestra. Riapri l’app prima di salvare.');
    if (previous && safetyLabel) {
      if (!this.driver.preserve) throw new Error('La copia di sicurezza non è disponibile. Operazione annullata.');
      await this.driver.preserve(previous, safetyLabel);
    }
    if (previous) await this.driver.backup(previous);
    await this.driver.write(next);
  }
  async safetyCopies(): Promise<SafetyCopy[]> {
    return this.driver.preserved ? parseCopies(await this.driver.preserved()) : [];
  }
}

export async function createRepository(): Promise<Repository> {
  if (isTauri()) {
    const { appDataDir, join } = await import('@tauri-apps/api/path');
    const { exists, readTextFile } = await import('@tauri-apps/plugin-fs');
    const archivePath = await join(await appDataDir(), 'memoles-world.json');
    const safetyPath = await join(await appDataDir(), 'memoles-world-safety.json');
    const readCopies = async (): Promise<SafetyCopy[]> => {
      if (!await exists(safetyPath)) return [];
      let envelope: unknown;
      try { envelope = JSON.parse(await readTextFile(safetyPath)); }
      catch { throw new Error('Le copie di sicurezza non sono leggibili. Nessun dato è stato eliminato.'); }
      if (!envelope || typeof envelope !== 'object' || !('copies' in envelope)) throw new Error('File delle copie di sicurezza incompleto. Operazione annullata.');
      return parseCopies(envelope.copies);
    };
    const readDisk = async (): Promise<unknown | null> => {
      if (!await exists(archivePath)) return null;
      let envelope: unknown;
      try { envelope = JSON.parse(await readTextFile(archivePath)); }
      catch { throw new Error('Archivio desktop non leggibile. I file sono stati conservati: consulta le istruzioni di recupero.'); }
      if (!envelope || typeof envelope !== 'object' || !('archive' in envelope) || envelope.archive == null) throw new Error('Archivio desktop incompleto. Nessun dato è stato sostituito.');
      return envelope.archive;
    };
    // StoreBuilder ignora gli errori di deserializzazione: controlliamo il file PRIMA
    // di aprire lo store per distinguere un primo avvio da un archivio corrotto.
    const existing = await readDisk();
    if (existing !== null) stateSchema.parse(existing);
    const { load } = await import('@tauri-apps/plugin-store');
    const options = { autoSave: false as const, defaults: {} };
    const current = await load('memoles-world.json', options);
    // Il recupero è separato dal file principale: non è sovrascritto se il caricamento fallisce.
    const recovery = await load('memoles-world-recovery.json', options);
    return new Repository({
      read: readDisk,
      write: async value => {
        const old = await current.get<unknown>('archive');
        await current.set('archive', value);
        try { await current.save(); }
        catch (error) {
          if (old !== undefined) await current.set('archive', old);
          throw error;
        }
      },
      backup: async value => { await recovery.set('archive', value); await recovery.save(); },
      preserved: readCopies,
      preserve: async (value, label) => {
        const copies = withCopy(await readCopies(), value, label);
        const safety = await load('memoles-world-safety.json', options);
        const previous = await safety.get<unknown>('copies');
        await safety.set('copies', copies);
        try { await safety.save(); }
        catch (error) { await safety.set('copies', previous ?? []); throw error; }
      },
    });
  }
  const readCopies = (): SafetyCopy[] => {
    const raw = localStorage.getItem(SAFETY_KEY);
    if (raw === null) return [];
    let parsed: unknown;
    try { parsed = JSON.parse(raw); }
    catch { throw new Error('Le copie di sicurezza non sono leggibili. Nessun dato è stato eliminato.'); }
    return parseCopies(parsed);
  };
  return new Repository({
    read: async () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      try { return JSON.parse(raw) as unknown; }
      catch { throw new Error('Archivio locale corrotto. I dati sono stati conservati: consulta le istruzioni di recupero.'); }
    },
    write: async value => { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); },
    backup: async value => { localStorage.setItem(RECOVERY_KEY, JSON.stringify(value)); },
    preserved: async () => readCopies(),
    preserve: async (value, label) => { localStorage.setItem(SAFETY_KEY, JSON.stringify(withCopy(readCopies(), value, label))); },
  });
}

export async function exportBackup(state: State): Promise<boolean> {
  const text = JSON.stringify(state, null, 2);
  const filename = `Memoles-World-backup-${new Date().toISOString().slice(0, 10)}.json`;
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({ defaultPath: filename, filters: [{ name: 'Backup JSON', extensions: ['json'] }] });
    if (!path) return false;
    await writeTextFile(path, text); return true;
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000); return true;
}

export async function readBackupFile(file: File): Promise<State> {
  if (file.size > 8 * 1024 * 1024) throw new Error('Il backup supera il limite di 8 MB');
  let raw: unknown;
  try { raw = JSON.parse(await file.text()); }
  catch { throw new Error('Il file non contiene un backup JSON leggibile'); }
  const parsed = stateSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Backup non valido: versione, importi o collegamenti non coerenti. Nessun dato modificato.');
  return parsed.data;
}
