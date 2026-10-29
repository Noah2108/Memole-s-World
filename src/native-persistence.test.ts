import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDemo } from './demo';
import { createRepository, exportBackup, readBackupFile } from './persistence';
import { resetArchive, resetFinance } from './management';

const mock = vi.hoisted(() => ({ files: new Map<string, string>(), opened: [] as string[], savePath: null as string | null, failPath: '', appDir: '/app' }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true }));
vi.mock('@tauri-apps/api/path', () => ({ appDataDir: async () => mock.appDir, join: async (...v: string[]) => v.join(mock.appDir.includes('\\') ? '\\' : '/') }));
vi.mock('@tauri-apps/plugin-fs', () => ({ exists: async (p: string) => mock.files.has(p), readTextFile: async (p: string) => mock.files.get(p), writeTextFile: async (p: string, text: string) => { mock.files.set(p, text); } }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: async () => mock.savePath }));
vi.mock('@tauri-apps/plugin-store', () => ({ load: async (name: string) => {
  mock.opened.push(name); const path = `${mock.appDir}${mock.appDir.includes('\\') ? '\\' : '/'}${name}`;
  let cache: Record<string, unknown> = {};
  try { cache = JSON.parse(mock.files.get(path) ?? '{}'); } catch { /* comportamento plugin */ }
  return { get: async (key: string) => cache[key], set: async (key: string, v: unknown) => { cache[key] = v; }, save: async () => { if (path === mock.failPath) throw new Error('Disco pieno'); mock.files.set(path, JSON.stringify(cache)); } };
} }));
beforeEach(() => { mock.files.clear(); mock.opened.length = 0; mock.savePath = null; mock.failPath = ''; mock.appDir = '/app'; });
describe('adattatore desktop con API Tauri simulate', () => {
  it.each([
    ['/Users/Hoara D’Amico/Library/Application Support/world.memoles.desktop', '/'],
    ['C:\\Users\\Hoara Demo\\AppData\\Roaming\\world.memoles.desktop', '\\'],
  ])('conserva archivio e copie nei percorsi di sistema: %s', async (appDir, separator) => {
    mock.appDir = appDir;
    const repo = await createRepository(), initial = createDemo();
    await repo.save(initial, null);
    const empty = resetArchive(initial);
    await repo.save(empty, initial.revision, 'Trasferimento Mac');
    expect(JSON.parse(mock.files.get(`${appDir}${separator}memoles-world.json`)!).archive).toEqual(empty);
    expect(JSON.parse(mock.files.get(`${appDir}${separator}memoles-world-recovery.json`)!).archive).toEqual(initial);
    const reopened = await createRepository();
    expect(await reopened.load()).toEqual(empty);
    expect((await reopened.safetyCopies())[0].state).toEqual(initial);
  });
  it('trasferisce un backup Windows al repository Mac senza cambiare formato o collegamenti', async () => {
    const initial = createDemo();
    mock.savePath = 'C:\\Users\\Hoara Demo\\Desktop\\backup.json';
    await exportBackup(initial);
    const imported = await readBackupFile(new File([mock.files.get(mock.savePath)!], 'backup.json', { type: 'application/json' }));
    mock.appDir = '/Users/Hoara D’Amico/Library/Application Support/world.memoles.desktop';
    const repo = await createRepository();
    await repo.save(imported, null);
    expect(await (await createRepository()).load()).toEqual(initial);
  });
  it('conserva JSON malformato e non apre lo store', async () => {
    mock.files.set('/app/memoles-world.json', '{corrotto');
    await expect(createRepository()).rejects.toThrow('non leggibile');
    expect(mock.files.get('/app/memoles-world.json')).toBe('{corrotto'); expect(mock.opened).toEqual([]);
  });
  it('non scambia un file vuoto o incompleto per un primo avvio', async () => {
    mock.files.set('/app/memoles-world.json', '{}');
    await expect(createRepository()).rejects.toThrow('incompleto'); expect(mock.opened).toEqual([]);
  });
  it('scrive, riapre e controlla ogni volta il disco', async () => {
    const repo = await createRepository(), state = createDemo(); await repo.save(state, null);
    expect(await (await createRepository()).load()).toEqual(state);
    mock.files.set('/app/memoles-world.json', '{corrotto');
    await expect(repo.load()).rejects.toThrow('non leggibile');
  });
  it('esporta solo nel file scelto e gestisce Annulla', async () => {
    const state = createDemo(); expect(await exportBackup(state)).toBe(false); expect(mock.files.size).toBe(0);
    mock.savePath = '/selected/backup.json'; expect(await exportBackup(state)).toBe(true);
    expect(JSON.parse(mock.files.get('/selected/backup.json')!)).toEqual(state);
  });
  it('conserva una copia completa prima di azzerare e riapre l’archivio vuoto', async () => {
    const repo = await createRepository(), initial = createDemo(); await repo.save(initial, null);
    const empty = resetArchive(initial); await repo.save(empty, initial.revision, 'Riparti da zero');
    const reopened = await createRepository(); expect(await reopened.load()).toEqual(empty);
    expect((await reopened.safetyCopies())[0].state).toEqual(initial);
  });
  it('mantiene gli ultimi 5 punti di ripristino in un file separato', async () => {
    const repo = await createRepository(); let state = createDemo(); await repo.save(state, null);
    for (let i = 0; i < 7; i++) { const next = resetFinance(state); await repo.save(next, state.revision, `Prova ${i}`); state = next; }
    expect((await repo.safetyCopies()).map(c => c.label)).toEqual(['Prova 2', 'Prova 3', 'Prova 4', 'Prova 5', 'Prova 6']);
    expect(mock.files.has('/app/memoles-world-safety.json')).toBe(true);
  });
  it('blocca l’azzeramento se il file di sicurezza è corrotto', async () => {
    const repo = await createRepository(), initial = createDemo(); await repo.save(initial, null);
    mock.files.set('/app/memoles-world-safety.json', '{corrotto');
    await expect(repo.save(resetArchive(initial), initial.revision, 'Azzera')).rejects.toThrow('copie di sicurezza');
    expect(await repo.load()).toEqual(initial); expect(mock.files.get('/app/memoles-world-safety.json')).toBe('{corrotto');
  });
  it('blocca l’azzeramento se non può scrivere la copia di sicurezza', async () => {
    const repo = await createRepository(), initial = createDemo(); await repo.save(initial, null);
    mock.failPath = '/app/memoles-world-safety.json';
    await expect(repo.save(resetArchive(initial), initial.revision, 'Azzera')).rejects.toThrow('Disco pieno');
    expect(await repo.load()).toEqual(initial);
  });
});
