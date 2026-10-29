import { z } from 'zod';

export const MAX_CENTS = 100_000_000;
const id = z.string().uuid();
const text = z.string().trim().max(1000);
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '2100-12-31') return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
const date = z.string().refine(validDate, 'Data non valida');
const cents = z.number().int().positive().max(MAX_CENTS);
const guardianSchema = z.object({
  id, name: text.min(2), relationship: text.min(1), phone: text.max(60),
  email: z.union([z.literal(''), z.email().max(254)]), notes: text,
  active: z.boolean().optional(),
}).strict();
const childSchema = z.object({
  id, firstName: text.min(1).max(80), lastName: text.min(1).max(80),
  birthDate: z.union([z.literal(''), date]), school: text.max(160), grade: text.max(60),
  guardianIds: z.array(id).min(1).max(20), notes: text, active: z.boolean(),
}).strict();
const agreementSchema = z.object({
  id, childId: id, kind: z.enum(['weekly', 'monthly', 'custom']), label: text.min(1).max(120),
  amountCents: cents, startsOn: date, endsOn: date.nullable(), dueDay: z.number().int().min(1).max(28),
}).strict().refine(a => !a.endsOn || a.endsOn >= a.startsOn, 'La fine precede l’inizio');
const chargeSchema = z.object({
  id, childId: id, agreementId: id, key: text.min(1), label: text.min(1).max(200),
  dueDate: date, periodStart: date, periodEnd: date, amountCents: cents, createdAt: z.iso.datetime(),
}).strict().refine(c => c.periodEnd >= c.periodStart, 'Periodo non valido');
const paymentSchema = z.object({
  id, chargeId: id, amountCents: cents, paidOn: date,
  method: z.enum(['bank', 'cash', 'card', 'other']), note: text, createdAt: z.iso.datetime(),
  voidedAt: z.iso.datetime().nullable(), voidReason: text,
}).strict().refine(p => !p.voidedAt || p.voidReason.length >= 3, 'Motivo di storno obbligatorio');
const auditSchema = z.object({ id, at: z.iso.datetime(), action: text.min(1), detail: text }).strict();

export const stateSchema = z.object({
  schemaVersion: z.literal(1), revision: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime(), demo: z.literal(true),
  guardians: z.array(guardianSchema).max(10000), children: z.array(childSchema).max(10000),
  agreements: z.array(agreementSchema).max(50000), charges: z.array(chargeSchema).max(100000),
  payments: z.array(paymentSchema).max(100000), audit: z.array(auditSchema).max(100000),
}).strict().superRefine((s, ctx) => {
  const problem = (message: string) => ctx.addIssue({ code: 'custom', message });
  for (const items of [s.guardians, s.children, s.agreements, s.charges, s.payments, s.audit]) {
    if (new Set(items.map(x => x.id)).size !== items.length) problem('Identificativi duplicati');
  }
  const children = new Map(s.children.map(x => [x.id, x]));
  const guardians = new Set(s.guardians.map(x => x.id));
  const agreements = new Map(s.agreements.map(x => [x.id, x]));
  const charges = new Map(s.charges.map(x => [x.id, x]));
  for (const c of s.children) {
    if (new Set(c.guardianIds).size !== c.guardianIds.length || c.guardianIds.some(g => !guardians.has(g))) problem('Collegamento tutore non valido');
  }
  const byChild = new Map<string, typeof s.agreements>();
  for (const a of s.agreements) {
    if (!children.has(a.childId)) problem('Bambino dell’accordo inesistente');
    const group = byChild.get(a.childId) ?? [];
    group.push(a); byChild.set(a.childId, group);
  }
  for (const group of byChild.values()) {
    group.sort((a, b) => a.startsOn.localeCompare(b.startsOn));
    for (let i = 1; i < group.length; i++) {
      if (!group[i - 1].endsOn || group[i - 1].endsOn! >= group[i].startsOn) problem('Accordi sovrapposti');
    }
  }
  if (new Set(s.charges.map(c => c.key)).size !== s.charges.length) problem('Scadenze duplicate');
  for (const c of s.charges) {
    const a = agreements.get(c.agreementId);
    if (!children.has(c.childId) || !a || a.childId !== c.childId) problem('Riferimento scadenza non valido');
  }
  const received = new Map<string, number>();
  for (const p of s.payments) {
    if (!charges.has(p.chargeId)) problem('Scadenza del pagamento inesistente');
    if (!p.voidedAt) received.set(p.chargeId, (received.get(p.chargeId) ?? 0) + p.amountCents);
  }
  for (const [chargeId, amount] of received) {
    if (amount > (charges.get(chargeId)?.amountCents ?? 0)) problem('Pagamento superiore al dovuto');
  }
});

export type State = z.infer<typeof stateSchema>;
export type Child = z.infer<typeof childSchema>;
export type Guardian = z.infer<typeof guardianSchema>;
export type Agreement = z.infer<typeof agreementSchema>;
export type Charge = z.infer<typeof chargeSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export const uuid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export function addDays(day: string, amount: number) {
  const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}
export function monthBounds(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !validDate(`${month}-01`)) throw new Error('Mese non valido');
  const d = new Date(`${month}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0);
  return { first: `${month}-01`, last: d.toISOString().slice(0, 10) };
}
export function parseMoney(value: string): number {
  if (!/^\d{1,7}([,.]\d{1,2})?$/.test(value.trim())) throw new Error('Usa un importo come 45,50, senza separatori delle migliaia.');
  const [whole, fraction = ''] = value.trim().replace(',', '.').split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (result <= 0 || result > MAX_CENTS) throw new Error('L’importo deve essere tra 0,01 € e 1.000.000 €.');
  return result;
}
export const euro = (amount: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount / 100);
export const dateLabel = (value: string) => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
export const childName = (child: Child) => `${child.firstName} ${child.lastName}`;
export const kindLabel = { weekly: 'Settimanale', monthly: 'Mensile fisso', custom: 'Personalizzato' };
export const methodLabel = { bank: 'Bonifico', cash: 'Contanti', card: 'Carta', other: 'Altro' };
export function balance(s: State, charge: Charge) {
  const received = s.payments.filter(p => p.chargeId === charge.id && !p.voidedAt).reduce((v, p) => v + p.amountCents, 0);
  return { expected: charge.amountCents, received, remaining: charge.amountCents - received };
}
export function totals(s: State, month: string, childId?: string) {
  const charges = s.charges.filter(c => c.dueDate.startsWith(month) && (!childId || c.childId === childId));
  return charges.reduce((sum, c) => {
    const b = balance(s, c);
    return { expected: sum.expected + b.expected, received: sum.received + b.received, remaining: sum.remaining + b.remaining };
  }, { expected: 0, received: 0, remaining: 0 });
}
function record(s: State, action: string, detail: string): State {
  return stateSchema.parse({ ...s, revision: s.revision + 1, updatedAt: now(), audit: [...s.audit, { id: uuid(), at: now(), action, detail }] });
}
export function saveGuardian(s: State, data: Guardian): State {
  const existing = s.guardians.find(g => g.id === data.id);
  const g = guardianSchema.parse({ ...data, active: data.active ?? existing?.active ?? true });
  return record({ ...s, guardians: [...s.guardians.filter(x => x.id !== g.id), g] }, 'Tutore salvato', g.name);
}
export function saveChild(s: State, data: Child): State {
  const c = childSchema.parse(data);
  if (c.birthDate && c.birthDate > today()) throw new Error('La nascita non può essere nel futuro.');
  const existing = s.children.find(x => x.id === c.id);
  if (c.guardianIds.some(id => s.guardians.find(g => g.id === id)?.active === false && !existing?.guardianIds.includes(id))) throw new Error('Riattiva il tutore prima di collegarlo a un nuovo bambino.');
  return record({ ...s, children: [...s.children.filter(x => x.id !== c.id), c] }, 'Bambino salvato', childName(c));
}
export function setChildActive(s: State, childId: string, active: boolean): State {
  const child = s.children.find(c => c.id === childId);
  if (!child) throw new Error('Bambino non trovato');
  return record({ ...s, children: s.children.map(c => c.id === childId ? { ...c, active } : c) }, active ? 'Bambino riattivato' : 'Bambino archiviato', childName(child));
}
export function addAgreement(s: State, data: Agreement): State {
  if (s.agreements.some(a => a.id === data.id)) throw new Error('Accordo già presente');
  const a = agreementSchema.parse(data);
  if (s.agreements.some(x => x.childId === a.childId && x.startsOn <= (a.endsOn ?? '2100-12-31') && (x.endsOn ?? '2100-12-31') >= a.startsOn)) throw new Error('Esiste già un accordo valido in queste date. Chiudi il precedente e scegli un inizio successivo.');
  const lastIssued = s.charges.filter(c => c.childId === a.childId).map(c => c.periodEnd).sort().at(-1);
  if (lastIssued && a.startsOn <= lastIssued) throw new Error(`Esistono scadenze emesse fino al ${dateLabel(lastIssued)}. Il nuovo accordo deve iniziare dopo questa data.`);
  return record({ ...s, agreements: [...s.agreements, a] }, 'Accordo aggiunto', `${a.label} · ${euro(a.amountCents)}`);
}
export function closeAgreement(s: State, agreementId: string, endsOn: string): State {
  const a = s.agreements.find(x => x.id === agreementId);
  if (!a) throw new Error('Accordo non trovato');
  if (a.endsOn) throw new Error('L’accordo è già chiuso');
  const lastIssued = s.charges.filter(c => c.agreementId === agreementId).map(c => c.periodEnd).sort().at(-1);
  if (lastIssued && endsOn < lastIssued) throw new Error(`Le scadenze emesse arrivano al ${dateLabel(lastIssued)}. La chiusura non può precederle.`);
  return record({ ...s, agreements: s.agreements.map(x => x.id === agreementId ? { ...x, endsOn } : x) }, 'Accordo chiuso', `${a.label} · ${endsOn}`);
}
export function plannedCharges(s: State, month: string): Charge[] {
  const { first, last } = monthBounds(month);
  const keys = new Set(s.charges.map(c => c.key));
  const active = new Set(s.children.filter(c => c.active).map(c => c.id));
  const result: Charge[] = [];
  for (const a of s.agreements) {
    if (!active.has(a.childId) || a.kind === 'custom' || a.startsOn > last || (a.endsOn && a.endsOn < first)) continue;
    const push = (periodStart: string, periodEnd: string, dueDate: string, key: string, label: string) => {
      if (!keys.has(key)) result.push({ id: uuid(), childId: a.childId, agreementId: a.id, key, label, dueDate, periodStart, periodEnd, amountCents: a.amountCents, createdAt: now() });
    };
    if (a.kind === 'monthly') {
      const start = a.startsOn > first ? a.startsOn : first;
      const end = a.endsOn && a.endsOn < last ? a.endsOn : last;
      const due = `${month}-${String(a.dueDay).padStart(2, '0')}`;
      push(start, end, due < start ? start : due > end ? end : due, `${a.id}:${month}`, `${a.label} · ${month}`);
    } else {
      const diff = Math.round((Date.parse(`${first}T12:00:00Z`) - Date.parse(`${a.startsOn}T12:00:00Z`)) / 86400000);
      let start = addDays(a.startsOn, Math.max(0, Math.ceil(diff / 7)) * 7);
      while (start <= last && (!a.endsOn || start <= a.endsOn)) {
        const end = addDays(start, 6);
        push(start, a.endsOn && a.endsOn < end ? a.endsOn : end, start, `${a.id}:${start}`, `${a.label} · ${dateLabel(start)}`);
        start = addDays(start, 7);
      }
    }
  }
  return result;
}
export function issueMonth(s: State, month: string): State {
  const charges = plannedCharges(s, month);
  if (!charges.length) return s;
  return record({ ...s, charges: [...s.charges, ...charges] }, 'Scadenze emesse', `${month} · ${charges.length} scadenze`);
}
export function addCustomCharge(s: State, agreementId: string, label: string, dueDate: string, amountCents: number): State {
  const a = s.agreements.find(x => x.id === agreementId);
  if (!a || a.kind !== 'custom') throw new Error('Accordo personalizzato non trovato');
  if (!s.children.find(c => c.id === a.childId)?.active) throw new Error('Riattiva prima il bambino');
  if (dueDate < a.startsOn || (a.endsOn && dueDate > a.endsOn)) throw new Error('La scadenza deve rientrare nella validità dell’accordo');
  const charge = chargeSchema.parse({ id: uuid(), childId: a.childId, agreementId, key: `custom:${uuid()}`, label, dueDate, periodStart: dueDate, periodEnd: dueDate, amountCents, createdAt: now() });
  return record({ ...s, charges: [...s.charges, charge] }, 'Scadenza personalizzata', `${label} · ${euro(amountCents)}`);
}
export function addPayment(s: State, data: Pick<Payment, 'chargeId' | 'amountCents' | 'paidOn' | 'method' | 'note'>): State {
  const c = s.charges.find(x => x.id === data.chargeId);
  if (!c) throw new Error('Scadenza non trovata');
  if (data.paidOn > today()) throw new Error('Un incasso non può avere una data futura');
  if (data.amountCents > balance(s, c).remaining) throw new Error('L’importo supera il residuo della scadenza');
  const p = paymentSchema.parse({ ...data, id: uuid(), createdAt: now(), voidedAt: null, voidReason: '' });
  return record({ ...s, payments: [...s.payments, p] }, 'Pagamento registrato', `${c.label} · ${euro(p.amountCents)} · ${methodLabel[p.method]}`);
}
export function voidPayment(s: State, paymentId: string, reason: string): State {
  const p = s.payments.find(x => x.id === paymentId);
  if (!p || p.voidedAt) throw new Error('Pagamento non trovato o già stornato');
  if (reason.trim().length < 3) throw new Error('Inserisci un motivo di almeno 3 caratteri');
  return record({ ...s, payments: s.payments.map(x => x.id === paymentId ? { ...x, voidedAt: now(), voidReason: reason.trim() } : x) }, 'Pagamento stornato', `${euro(p.amountCents)} · ${reason.trim()}`);
}
export function restoreState(current: State, imported: unknown): State {
  const next = stateSchema.parse(imported);
  return record({ ...next, revision: current.revision }, 'Backup ripristinato', 'Ripristino esplicito dell’archivio demo');
}
