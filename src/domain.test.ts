import { describe, expect, it } from 'vitest';
import { addAgreement, addCustomCharge, addPayment, balance, closeAgreement, issueMonth, monthBounds, parseMoney, plannedCharges, restoreState, saveChild, saveGuardian, setChildActive, stateSchema, totals, validDate, voidPayment, uuid, type Agreement, type State } from './domain';

function fixture(kind: Agreement['kind'] = 'monthly', startsOn = '2024-01-01', endsOn: string | null = null): State {
  const g = uuid(), c = uuid();
  return { schemaVersion: 1, revision: 0, updatedAt: new Date().toISOString(), demo: true,
    guardians: [{ id: g, name: 'Genitore Demo', relationship: 'Tutore', phone: '', email: '', notes: '' }],
    children: [{ id: c, firstName: 'Bimbo', lastName: 'Demo', birthDate: '', school: '', grade: '', guardianIds: [g], notes: '', active: true }],
    agreements: [{ id: uuid(), childId: c, label: 'Retta', kind, amountCents: 10000, startsOn, endsOn, dueDay: 5 }], charges: [], payments: [], audit: [] };
}
function pay(s: State, amountCents: number, paidOn = '2024-02-05') {
  return addPayment(s, { chargeId: s.charges[0].id, amountCents, paidOn, method: 'cash', note: '' });
}
describe('date e denaro', () => {
  it('converte euro senza aritmetica floating point', () => {
    expect(parseMoney('0,29')).toBe(29); expect(parseMoney('110.5')).toBe(11050);
    expect(parseMoney('1000000')).toBe(100000000);
  });
  it.each(['', '0', '-1', 'NaN', '1,001', '1.000,00', 'Infinity', '1e2', '1000000,01'])('rifiuta %s', v => expect(() => parseMoney(v)).toThrow());
  it('gestisce bisestili e cambio anno senza fuso orario', () => {
    expect(monthBounds('2024-02').last).toBe('2024-02-29'); expect(monthBounds('2023-02').last).toBe('2023-02-28');
    expect(monthBounds('2024-12').last).toBe('2024-12-31');
    expect(validDate('2024-02-30')).toBe(false); expect(validDate('2024-99-99')).toBe(false);
    expect(() => monthBounds('2024-13')).toThrow();
  });
});
describe('accordi e scadenze', () => {
  it('emette una sola volta il mensile e conserva l’importo', () => {
    const s = issueMonth(fixture(), '2024-02');
    expect(s.charges).toHaveLength(1); expect(issueMonth(s, '2024-02')).toBe(s);
    expect(s.charges[0].amountCents).toBe(10000);
  });
  it('mensile parziale senza pro-rata, con scadenza nell’intervallo', () => {
    const s = issueMonth(fixture('monthly', '2024-02-12', '2024-02-20'), '2024-02');
    expect(s.charges[0]).toMatchObject({ dueDate: '2024-02-12', amountCents: 10000, periodEnd: '2024-02-20' });
  });
  it('rispetta un accordo che finisce prima del giorno di scadenza', () => {
    expect(plannedCharges(fixture('monthly', '2024-01-01', '2024-02-02'), '2024-02')[0].dueDate).toBe('2024-02-02');
  });
  it('settimanale con 5 scadenze e settimana a cavallo del mese', () => {
    let s = fixture('weekly', '2024-01-01'); s = issueMonth(s, '2024-01');
    expect(s.charges).toHaveLength(5); expect(s.charges[4].periodEnd).toBe('2024-02-04');
    const feb = plannedCharges(s, '2024-02'); expect(feb).toHaveLength(4); expect(feb[0].periodStart).toBe('2024-02-05');
  });
  it('gestisce 29 febbraio e intervalli chiusi', () => {
    const s = issueMonth(fixture('weekly', '2024-02-01', '2024-02-29'), '2024-02');
    expect(s.charges).toHaveLength(5); expect(s.charges[4].periodEnd).toBe('2024-02-29');
    expect(plannedCharges(s, '2024-03')).toHaveLength(0);
  });
  it('archivia senza perdere storico e non genera altre rette', () => {
    let s = issueMonth(fixture(), '2024-02'); s = setChildActive(s, s.children[0].id, false);
    expect(s.charges).toHaveLength(1); expect(plannedCharges(s, '2024-03')).toHaveLength(0);
  });
  it('rifiuta accordi sovrapposti e accetta il successivo', () => {
    let s = fixture(); const next = { ...s.agreements[0], id: uuid(), startsOn: '2024-03-01' };
    expect(() => addAgreement(s, next)).toThrow();
    s = closeAgreement(s, s.agreements[0].id, '2024-02-29');
    expect(addAgreement(s, next).agreements).toHaveLength(2);
  });
  it('non permette chiusure o nuovi accordi retroattivi su periodi emessi', () => {
    const s = issueMonth(fixture(), '2024-02');
    expect(() => closeAgreement(s, s.agreements[0].id, '2024-02-15')).toThrow();
    expect(() => addAgreement(s, { ...s.agreements[0], id: uuid(), startsOn: '2024-02-10' })).toThrow();
    expect(closeAgreement(s, s.agreements[0].id, '2024-02-29').charges).toEqual(s.charges);
  });
  it('personalizzato non genera automaticamente e rispetta la validità', () => {
    const s = fixture('custom', '2024-02-01', '2024-02-29');
    expect(plannedCharges(s, '2024-02')).toHaveLength(0);
    expect(addCustomCharge(s, s.agreements[0].id, 'Incontri', '2024-02-15', 3500).charges[0].amountCents).toBe(3500);
    expect(() => addCustomCharge(s, s.agreements[0].id, 'Incontri', '2024-03-01', 3500)).toThrow();
  });
});
describe('pagamenti e saldi', () => {
  it('somma acconto e saldo esattamente e respinge l’eccedenza', () => {
    let s = pay(issueMonth(fixture(), '2024-02'), 2999);
    expect(balance(s, s.charges[0]).remaining).toBe(7001);
    expect(() => pay(s, 7002)).toThrow();
    s = pay(s, 7001); expect(totals(s, '2024-02')).toEqual({ expected: 10000, received: 10000, remaining: 0 });
    expect(() => pay(s, 1)).toThrow();
  });
  it.each([0, -1, 1.5, NaN])('respinge pagamento %s', amount => expect(() => pay(issueMonth(fixture(), '2024-02'), amount)).toThrow());
  it('respinge incassi futuri', () => expect(() => pay(issueMonth(fixture(), '2024-02'), 100, '2099-01-01')).toThrow());
  it('mantiene il collegamento al mese della retta anche per incassi successivi', () => {
    const s = pay(issueMonth(fixture(), '2024-02'), 4000, '2024-03-10');
    expect(totals(s, '2024-02').received).toBe(4000); expect(totals(s, '2024-03').received).toBe(0);
  });
  it('storna con motivo, conserva lo storico e riapre il residuo', () => {
    const s = pay(issueMonth(fixture(), '2024-02'), 10000);
    expect(() => voidPayment(s, s.payments[0].id, '')).toThrow();
    const next = voidPayment(s, s.payments[0].id, 'Importo registrato per errore');
    expect(next.payments).toHaveLength(1); expect(next.payments[0].voidedAt).toBeTruthy();
    expect(totals(next, '2024-02').remaining).toBe(10000);
    expect(() => voidPayment(next, next.payments[0].id, 'Doppio')).toThrow();
  });
});
describe('integrità anagrafiche e backup', () => {
  it('permette un tutore condiviso tra fratelli e modifiche persistibili', () => {
    let s = fixture(); s = saveGuardian(s, { ...s.guardians[0], phone: 'Numero demo' });
    s = saveChild(s, { ...s.children[0], id: uuid(), firstName: 'Sorellina' });
    expect(s.children).toHaveLength(2); expect(s.guardians).toHaveLength(1);
  });
  it('respinge tutori inesistenti e date future', () => {
    const s = fixture(); expect(() => saveChild(s, { ...s.children[0], guardianIds: [uuid()] })).toThrow();
    expect(() => saveChild(s, { ...s.children[0], birthDate: '2099-01-01' })).toThrow();
  });
  it('valida riferimenti, versioni, duplicati e saldi su import', () => {
    const s = pay(issueMonth(fixture(), '2024-02'), 5000);
    expect(stateSchema.safeParse({ ...s, schemaVersion: 2 }).success).toBe(false);
    expect(stateSchema.safeParse({ ...s, payments: [{ ...s.payments[0], chargeId: uuid() }] }).success).toBe(false);
    expect(stateSchema.safeParse({ ...s, charges: [s.charges[0], { ...s.charges[0], id: uuid() }] }).success).toBe(false);
    expect(stateSchema.safeParse({ ...s, payments: [{ ...s.payments[0], amountCents: 10001 }] }).success).toBe(false);
    expect(restoreState(s, JSON.parse(JSON.stringify(s))).revision).toBe(s.revision + 1);
  });
});
