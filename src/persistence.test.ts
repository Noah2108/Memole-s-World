import { describe, expect, it } from 'vitest';
import { createDemo } from './demo';
import { Repository, type Driver } from './persistence';
import { saveGuardian, type State } from './domain';

function memory() {
  let disk: unknown | null = null;
  let recovery: State | null = null;
  const driver: Driver = { read: async () => structuredClone(disk), write: async s => { disk = structuredClone(s); }, backup: async s => { recovery = structuredClone(s); } };
  return { driver, set: (v: unknown) => { disk = v; }, recovery: () => recovery };
}
describe('archivio prototipale', () => {
  it('riapre l’archivio e conserva la precedente versione separatamente', async () => {
    const mem = memory(), repo = new Repository(mem.driver), initial = createDemo();
    expect(await repo.load()).toBeNull(); await repo.save(initial, null);
    const next = saveGuardian(initial, { ...initial.guardians[0], name: 'Nome modificato' });
    await repo.save(next, initial.revision);
    expect(await new Repository(mem.driver).load()).toEqual(next); expect(mem.recovery()).toEqual(initial);
  });
  it('non sostituisce un archivio corrotto o futuro con dati demo', async () => {
    const mem = memory(); mem.set({ schemaVersion: 99 }); const repo = new Repository(mem.driver);
    await expect(repo.load()).rejects.toThrow('non leggibile');
    await expect(repo.save(createDemo(), null)).rejects.toThrow(); expect(mem.recovery()).toBeNull();
  });
  it('rileva una seconda finestra con revisione obsoleta', async () => {
    const mem = memory(), repo = new Repository(mem.driver), initial = createDemo(); await repo.save(initial, null);
    const next = saveGuardian(initial, { ...initial.guardians[0], name: 'Altro nome' });
    await repo.save(next, initial.revision);
    await expect(repo.save(initial, initial.revision)).rejects.toThrow('altra finestra');
  });
  it('se fallisce il backup non scrive il principale', async () => {
    const mem = memory(), initial = createDemo(); mem.set(initial);
    mem.driver.backup = async () => { throw new Error('Disco pieno'); };
    await expect(new Repository(mem.driver).save({ ...initial, revision: initial.revision + 1 }, initial.revision)).rejects.toThrow('Disco pieno');
    expect(await new Repository(mem.driver).load()).toEqual(initial);
  });
  it('propaga il fallimento di salvataggio e conserva una copia precedente', async () => {
    const mem = memory(), initial = createDemo(); mem.set(initial);
    mem.driver.write = async () => { throw new Error('Disco pieno'); };
    await expect(new Repository(mem.driver).save({ ...initial, revision: initial.revision + 1 }, initial.revision)).rejects.toThrow('Disco pieno');
    expect(mem.recovery()).toEqual(initial);
  });
  it('non elimina se il punto di ripristino fallisce', async () => {
    const mem = memory(), initial = createDemo(); mem.set(initial);
    mem.driver.preserve = async () => { throw new Error('Copia di sicurezza non riuscita'); };
    await expect(new Repository(mem.driver).save({ ...initial, revision: initial.revision + 1, children: [], guardians: [], agreements: [], charges: [], payments: [], audit: [] }, initial.revision, 'Svuota tutto')).rejects.toThrow('Copia di sicurezza');
    expect(await new Repository(mem.driver).load()).toEqual(initial); expect(mem.recovery()).toBeNull();
  });
  it('controlla la revisione prima di produrre copie o cancellazioni', async () => {
    const mem = memory(), initial = createDemo(); mem.set(initial); let copied = false;
    mem.driver.preserve = async () => { copied = true; };
    await expect(new Repository(mem.driver).save(initial, initial.revision - 1, 'Elimina')).rejects.toThrow('altra finestra');
    expect(copied).toBe(false);
  });
});
