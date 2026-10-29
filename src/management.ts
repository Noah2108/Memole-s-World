import { balance, childName, euro, now, stateSchema, today, uuid, type Agreement, type Charge, type Payment, type State } from './domain';

function record(s: State, action: string, detail: string): State {
  return stateSchema.parse({ ...s, revision: s.revision + 1, updatedAt: now(), audit: [...s.audit, { id: uuid(), at: now(), action, detail }] });
}

export function childRemovalSummary(s: State, childId: string) {
  const child = s.children.find(c => c.id === childId);
  if (!child) throw new Error('Bambino non trovato');
  const charges = s.charges.filter(c => c.childId === childId);
  const ids = new Set(charges.map(c => c.id));
  return {
    child, agreements: s.agreements.filter(a => a.childId === childId).length,
    charges: charges.length, payments: s.payments.filter(p => ids.has(p.chargeId)).length,
    unusedGuardians: s.guardians.filter(g => child.guardianIds.includes(g.id) && !s.children.some(c => c.id !== childId && c.guardianIds.includes(g.id))),
  };
}

export function deleteChild(s: State, childId: string, removeUnusedGuardians = false): State {
  const summary = childRemovalSummary(s, childId);
  const chargeIds = new Set(s.charges.filter(c => c.childId === childId).map(c => c.id));
  const guardianIds = new Set(removeUnusedGuardians ? summary.unusedGuardians.map(g => g.id) : []);
  return record({ ...s,
    children: s.children.filter(c => c.id !== childId),
    guardians: s.guardians.filter(g => !guardianIds.has(g.id)),
    agreements: s.agreements.filter(a => a.childId !== childId),
    charges: s.charges.filter(c => c.childId !== childId),
    payments: s.payments.filter(p => !chargeIds.has(p.chargeId)),
  }, 'Bambino eliminato', `${childName(summary.child)} · ${summary.charges} rette e ${summary.payments} pagamenti rimossi`);
}

export function setGuardianActive(s: State, guardianId: string, active: boolean): State {
  const guardian = s.guardians.find(g => g.id === guardianId);
  if (!guardian) throw new Error('Tutore non trovato');
  return record({ ...s, guardians: s.guardians.map(g => g.id === guardianId ? { ...g, active } : g) }, active ? 'Tutore riattivato' : 'Tutore archiviato', guardian.name);
}

export function deleteGuardian(s: State, guardianId: string, replacementId?: string): State {
  const guardian = s.guardians.find(g => g.id === guardianId);
  if (!guardian) throw new Error('Tutore non trovato');
  if (replacementId && (replacementId === guardianId || !s.guardians.some(g => g.id === replacementId && g.active !== false))) throw new Error('Scegli un altro tutore attivo.');
  const children = s.children.map(c => {
    if (!c.guardianIds.includes(guardianId)) return c;
    const ids = [...new Set([...c.guardianIds.filter(id => id !== guardianId), ...(replacementId ? [replacementId] : [])])];
    if (!ids.length) throw new Error(`${childName(c)} deve avere almeno un tutore. Scegli un sostituto oppure modifica prima la sua scheda.`);
    return { ...c, guardianIds: ids };
  });
  return record({ ...s, children, guardians: s.guardians.filter(g => g.id !== guardianId) }, 'Tutore eliminato', `${guardian.name}${replacementId ? ' · collegamenti trasferiti' : ''}`);
}

export function updateAgreement(s: State, data: Agreement): State {
  const old = s.agreements.find(a => a.id === data.id);
  if (!old || old.childId !== data.childId) throw new Error('Accordo non trovato');
  const charges = s.charges.filter(c => c.agreementId === old.id);
  if (charges.length && (data.kind !== old.kind || data.startsOn !== old.startsOn)) throw new Error('Tipo e inizio non si possono cambiare mentre esistono rette collegate. Elimina prima quelle rette oppure crea un nuovo accordo.');
  const lastIssued = charges.map(c => c.periodEnd).sort().at(-1);
  if (lastIssued && data.endsOn && data.endsOn < lastIssued) throw new Error('La fine dell’accordo precede una retta già emessa.');
  return record({ ...s, agreements: s.agreements.map(a => a.id === old.id ? data : a) }, 'Accordo modificato', `${old.label} · ${euro(old.amountCents)} → ${euro(data.amountCents)} · rette emesse conservate`);
}

export function deleteAgreement(s: State, agreementId: string): State {
  const agreement = s.agreements.find(a => a.id === agreementId);
  if (!agreement) throw new Error('Accordo non trovato');
  const ids = new Set(s.charges.filter(c => c.agreementId === agreementId).map(c => c.id));
  return record({ ...s, agreements: s.agreements.filter(a => a.id !== agreementId), charges: s.charges.filter(c => !ids.has(c.id)), payments: s.payments.filter(p => !ids.has(p.chargeId)) }, 'Accordo eliminato', `${agreement.label} · ${ids.size} rette collegate rimosse`);
}

export function updateCharge(s: State, chargeId: string, data: Pick<Charge, 'label' | 'dueDate' | 'amountCents'>): State {
  const charge = s.charges.find(c => c.id === chargeId);
  if (!charge) throw new Error('Retta non trovata');
  if (data.amountCents < balance(s, charge).received) throw new Error('La retta non può essere inferiore ai pagamenti ricevuti. Correggi, storna o elimina prima i pagamenti interessati.');
  return record({ ...s, charges: s.charges.map(c => c.id === chargeId ? { ...c, ...data } : c) }, 'Retta modificata', `${charge.label} · ${euro(charge.amountCents)} → ${euro(data.amountCents)} · scadenza ${charge.dueDate} → ${data.dueDate}`);
}

export function deleteCharge(s: State, chargeId: string): State {
  const charge = s.charges.find(c => c.id === chargeId);
  if (!charge) throw new Error('Retta non trovata');
  return record({ ...s, charges: s.charges.filter(c => c.id !== chargeId), payments: s.payments.filter(p => p.chargeId !== chargeId) }, 'Retta eliminata', `${charge.label} · ${euro(charge.amountCents)} · pagamenti collegati rimossi`);
}

export function updatePayment(s: State, paymentId: string, data: Pick<Payment, 'amountCents' | 'paidOn' | 'method' | 'note'>): State {
  const payment = s.payments.find(p => p.id === paymentId);
  if (!payment) throw new Error('Pagamento non trovato');
  if (payment.voidedAt) throw new Error('Un pagamento stornato non si modifica. Puoi eliminarlo o registrare un nuovo pagamento.');
  if (data.paidOn > today()) throw new Error('Un incasso non può avere una data futura');
  const charge = s.charges.find(c => c.id === payment.chargeId)!;
  if (data.amountCents > balance(s, charge).remaining + payment.amountCents) throw new Error('L’importo supera il dovuto della retta.');
  return record({ ...s, payments: s.payments.map(p => p.id === paymentId ? { ...p, ...data } : p) }, 'Pagamento modificato', `${charge.label} · ${euro(payment.amountCents)} → ${euro(data.amountCents)} · ${data.paidOn}`);
}

export function deletePayment(s: State, paymentId: string): State {
  const payment = s.payments.find(p => p.id === paymentId);
  if (!payment) throw new Error('Pagamento non trovato');
  return record({ ...s, payments: s.payments.filter(p => p.id !== paymentId) }, 'Pagamento eliminato', `${euro(payment.amountCents)} · ${payment.paidOn}${payment.voidedAt ? ' · già stornato' : ' · residuo ricalcolato'}`);
}

export function resetFinance(s: State): State {
  return record({ ...s, charges: [], payments: [] }, 'Rette e pagamenti azzerati', `${s.charges.length} rette e ${s.payments.length} pagamenti rimossi; anagrafiche e accordi conservati`);
}

export function resetArchive(s: State): State {
  return stateSchema.parse({ ...s, revision: s.revision + 1, updatedAt: now(), children: [], guardians: [], agreements: [], charges: [], payments: [], audit: [] });
}
