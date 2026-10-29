import { describe, expect, it } from 'vitest';
import { createDemo } from './demo';
import { addPayment, balance, plannedCharges, saveChild, saveGuardian, stateSchema, today, totals, uuid, voidPayment } from './domain';
import { childRemovalSummary, deleteAgreement, deleteCharge, deleteChild, deleteGuardian, deletePayment, resetArchive, resetFinance, setGuardianActive, updateAgreement, updateCharge, updatePayment } from './management';

const demo = () => createDemo();
describe('rimozione delle famiglie e collegamenti', () => {
  it('elimina bambino e dati economici collegati senza toccare gli altri', () => {
    const s = demo(), original = structuredClone(s), child = s.children[0];
    const summary = childRemovalSummary(s, child.id);
    expect(summary.payments).toBe(1);
    const next = deleteChild(s, child.id);
    expect(next.children).toHaveLength(3); expect(next.guardians).toHaveLength(4);
    expect(next.agreements.some(a => a.childId === child.id)).toBe(false);
    expect(next.charges.some(c => c.childId === child.id)).toBe(false);
    expect(next.payments).toHaveLength(s.payments.length - 1);
    expect(next.charges.filter(c => c.childId !== child.id)).toEqual(s.charges.filter(c => c.childId !== child.id));
    expect(stateSchema.safeParse(next).success).toBe(true); expect(s).toEqual(original);
  });
  it('rimuove un tutore rimasto senza bambini solo se esplicitamente scelto', () => {
    const s = demo(), c = s.children[0];
    expect(deleteChild(s, c.id, true).guardians.some(g => c.guardianIds.includes(g.id))).toBe(false);
    expect(deleteChild(s, c.id, false).guardians).toEqual(s.guardians);
  });
  it('conserva sempre il genitore condiviso con un fratello', () => {
    let s = demo(); const child = s.children[0];
    s = saveChild(s, { ...child, id: uuid(), firstName: 'Fratello demo' });
    const next = deleteChild(s, child.id, true);
    expect(next.guardians.some(g => g.id === child.guardianIds[0])).toBe(true);
    expect(next.children.find(c => c.firstName === 'Fratello demo')?.guardianIds).toEqual(child.guardianIds);
  });
  it('impedisce di eliminare l’unico tutore senza sostituto', () => {
    const s = demo(); expect(() => deleteGuardian(s, s.guardians[0].id)).toThrow('almeno un tutore');
  });
  it('trasferisce tutti i collegamenti al sostituto senza duplicati', () => {
    let s = demo(); const old = s.guardians[0].id, replacement = s.guardians[1].id;
    s = saveChild(s, { ...s.children[0], guardianIds: [old, replacement] });
    s = saveChild(s, { ...s.children[0], id: uuid(), firstName: 'Fratello', guardianIds: [old] });
    const next = deleteGuardian(s, old, replacement);
    expect(next.children.filter(c => c.guardianIds.includes(replacement))).toHaveLength(3);
    expect(next.children.some(c => c.guardianIds.includes(old))).toBe(false);
    expect(next.children[0].guardianIds).toEqual([replacement]);
    expect(next.charges).toEqual(s.charges); expect(next.payments).toEqual(s.payments);
  });
  it('scollega il tutore se ogni bambino conserva un altro referente', () => {
    let s = demo(); s = saveChild(s, { ...s.children[0], guardianIds: [s.guardians[0].id, s.guardians[1].id] });
    expect(deleteGuardian(s, s.guardians[0].id).children[0].guardianIds).toEqual([s.guardians[1].id]);
  });
  it('archivia e riattiva senza perdere i collegamenti o riattivare modificando il contatto', () => {
    const s = demo(), g = s.guardians[0];
    let next = setGuardianActive(s, g.id, false);
    expect(next.children).toEqual(s.children);
    next = saveGuardian(next, { ...g, name: 'Nome corretto' });
    expect(next.guardians.find(x => x.id === g.id)?.active).toBe(false);
    expect(() => saveChild(next, { ...s.children[0], id: uuid() })).toThrow('Riattiva');
    expect(saveChild(next, { ...s.children[0], notes: 'Modifica scheda esistente' }).children).toHaveLength(4);
    expect(setGuardianActive(next, g.id, true).guardians.find(x => x.id === g.id)?.active).toBe(true);
  });
  it('respinge sostituti inesistenti, archiviati o coincidenti col tutore eliminato', () => {
    let s = demo(); const g = s.guardians[0].id, other = s.guardians[1].id;
    expect(() => deleteGuardian(s, g, g)).toThrow(); expect(() => deleteGuardian(s, g, uuid())).toThrow();
    s = setGuardianActive(s, other, false); expect(() => deleteGuardian(s, g, other)).toThrow();
  });
  it('legge senza migrazioni distruttive i vecchi backup privi dello stato del tutore', () => {
    const s = demo(); expect(s.guardians[0].active).toBeUndefined();
    expect(stateSchema.parse(JSON.parse(JSON.stringify(s))).guardians).toEqual(s.guardians);
  });
});

describe('correzione e rimozione di accordi e rette', () => {
  it('modifica la tariffa futura preservando le rette già emesse', () => {
    const s = demo(), a = s.agreements[0];
    const next = updateAgreement(s, { ...a, amountCents: 25000, label: 'Accordo corretto' });
    expect(next.charges).toEqual(s.charges); expect(next.payments).toEqual(s.payments);
    const date = new Date(`${today().slice(0, 7)}-01T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + 1);
    expect(plannedCharges(next, date.toISOString().slice(0, 7)).find(c => c.agreementId === a.id)?.amountCents).toBe(25000);
  });
  it('respinge tipo, inizio o fine incompatibili con rette già emesse', () => {
    const s = demo(), a = s.agreements[0];
    expect(() => updateAgreement(s, { ...a, kind: 'weekly' })).toThrow('Tipo e inizio');
    expect(() => updateAgreement(s, { ...a, startsOn: '2024-01-01' })).toThrow('Tipo e inizio');
    expect(() => updateAgreement(s, { ...a, endsOn: a.startsOn })).toThrow('precede');
  });
  it('permette di sistemare interamente un accordo senza rette e respinge sovrapposizioni', () => {
    const s = resetFinance(demo()), a = s.agreements[0];
    expect(updateAgreement(s, { ...a, kind: 'weekly', startsOn: '2024-01-01' }).agreements[0].kind).toBe('weekly');
    expect(() => updateAgreement({ ...s, agreements: [...s.agreements, { ...a, id: uuid(), startsOn: '2024-01-01' }] }, a)).toThrow();
  });
  it('elimina l’accordo con tutte le sue rette e i pagamenti, conservando il bambino', () => {
    const s = demo(), a = s.agreements[0], next = deleteAgreement(s, a.id);
    expect(next.children).toEqual(s.children); expect(next.agreements).toHaveLength(3);
    expect(next.charges.some(c => c.agreementId === a.id)).toBe(false); expect(next.payments).toHaveLength(1);
    expect(stateSchema.safeParse(next).success).toBe(true);
  });
  it('corregge la retta, ricalcola il residuo e non altera la chiave di emissione', () => {
    const s = demo(), c = s.charges.find(c => c.childId === s.children[0].id)!;
    const next = updateCharge(s, c.id, { label: 'Retta corretta', dueDate: today(), amountCents: 25000 });
    expect(balance(next, next.charges.find(x => x.id === c.id)!)).toEqual({ expected: 25000, received: 22000, remaining: 3000 });
    expect(next.charges.find(x => x.id === c.id)?.key).toBe(c.key); expect(next.agreements).toEqual(s.agreements);
    expect(() => updateCharge(s, c.id, { label: c.label, dueDate: c.dueDate, amountCents: 21999 })).toThrow('inferiore');
  });
  it('elimina anche i pagamenti stornati collegati a una retta', () => {
    let s = demo(); const p = s.payments[0]; s = voidPayment(s, p.id, 'Prova storno');
    const next = deleteCharge(s, p.chargeId);
    expect(next.payments.some(x => x.chargeId === p.chargeId)).toBe(false);
    expect(next.charges.some(c => c.id === p.chargeId)).toBe(false);
    expect(plannedCharges(next, today().slice(0, 7)).some(c => c.key === s.charges.find(c => c.id === p.chargeId)?.key)).toBe(true);
  });
});

describe('correzione pagamenti e azzeramenti', () => {
  it('corregge un pagamento ricalcolando saldo e metodo senza cambiare la retta', () => {
    const s = demo(), p = s.payments[0];
    const next = updatePayment(s, p.id, { amountCents: 18001, paidOn: today(), method: 'card', note: 'Correzione demo' });
    expect(next.payments[0]).toMatchObject({ id: p.id, chargeId: p.chargeId, amountCents: 18001, method: 'card', createdAt: p.createdAt });
    expect(balance(next, next.charges.find(c => c.id === p.chargeId)!).remaining).toBe(3999);
  });
  it('calcola il massimo tenendo conto degli altri acconti', () => {
    let s = demo(); const p = s.payments[1];
    s = addPayment(s, { chargeId: p.chargeId, amountCents: 1000, paidOn: today(), method: 'cash', note: '' });
    expect(() => updatePayment(s, p.id, { amountCents: 5001, paidOn: today(), method: 'cash', note: '' })).toThrow('supera');
    expect(updatePayment(s, p.id, { amountCents: 5000, paidOn: today(), method: 'cash', note: '' }).payments.find(x => x.id === p.id)?.amountCents).toBe(5000);
  });
  it('respinge pagamenti futuri, non positivi e modifiche agli stornati', () => {
    const s = demo(), p = s.payments[0], data = { amountCents: 100, paidOn: today(), method: p.method, note: '' };
    expect(() => updatePayment(s, p.id, { ...data, paidOn: '2099-01-01' })).toThrow();
    expect(() => updatePayment(s, p.id, { ...data, amountCents: 0 })).toThrow();
    expect(() => updatePayment(voidPayment(s, p.id, 'Prova storno'), p.id, data)).toThrow('stornato');
  });
  it('rimuove un pagamento valido riaprendo il residuo e uno stornato senza doppio effetto', () => {
    const s = demo(), p = s.payments[0];
    const next = deletePayment(s, p.id), charge = next.charges.find(c => c.id === p.chargeId)!;
    expect(balance(next, charge).remaining).toBe(22000);
    expect(balance(deletePayment(voidPayment(s, p.id, 'Prova storno'), p.id), charge).remaining).toBe(22000);
  });
  it('azzera solo i dati economici mantenendo anagrafiche e accordi', () => {
    const s = demo(), next = resetFinance(s);
    expect(next.children).toEqual(s.children); expect(next.guardians).toEqual(s.guardians); expect(next.agreements).toEqual(s.agreements);
    expect(next.charges).toEqual([]); expect(next.payments).toEqual([]);
    expect(totals(next, today().slice(0, 7))).toEqual({ expected: 0, received: 0, remaining: 0 });
    expect(plannedCharges(next, today().slice(0, 7)).length).toBeGreaterThan(0);
  });
  it('riparte da zero anche nello storico, con revisione crescente', () => {
    const s = demo(), next = resetArchive(s);
    for (const field of ['children', 'guardians', 'agreements', 'charges', 'payments', 'audit'] as const) expect(next[field]).toEqual([]);
    expect(next.revision).toBe(s.revision + 1); expect(stateSchema.safeParse(next).success).toBe(true);
  });
  it('non considera riuscita la rimozione di elementi inesistenti', () => {
    const s = demo();
    for (const fn of [deleteChild, deleteGuardian, deleteAgreement, deleteCharge, deletePayment]) expect(() => fn(s, uuid())).toThrow();
  });
});
