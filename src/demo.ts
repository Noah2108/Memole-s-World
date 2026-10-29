import { addCustomCharge, addDays, addPayment, issueMonth, monthBounds, now, today, uuid, type State } from './domain';

export function createDemo(day = today()): State {
  const month = day.slice(0, 7);
  const { first } = monthBounds(month);
  const guardians: State['guardians'] = [
    { id: uuid(), name: 'Giulia Rossi', relationship: 'Mamma', phone: '', email: 'giulia.rossi@example.invalid', notes: 'Contatto dimostrativo' },
    { id: uuid(), name: 'Marco Bianchi', relationship: 'Papà', phone: '', email: 'marco.bianchi@example.invalid', notes: 'Contatto dimostrativo' },
    { id: uuid(), name: 'Elena Costa', relationship: 'Mamma', phone: '', email: 'elena.costa@example.invalid', notes: 'Contatto dimostrativo' },
    { id: uuid(), name: 'Sara Fontana', relationship: 'Tutrice', phone: '', email: '', notes: 'Contatto dimostrativo' },
  ];
  const children: State['children'] = [
    { id: uuid(), firstName: 'Sofia', lastName: 'Rossi', birthDate: '2017-04-12', school: 'Scuola Primaria Arcobaleno', grade: '4ª primaria', guardianIds: [guardians[0].id], notes: 'Le piacciono i racconti e i piccoli esperimenti.', active: true },
    { id: uuid(), firstName: 'Leonardo', lastName: 'Bianchi', birthDate: '2016-09-20', school: 'Scuola Primaria Arcobaleno', grade: '5ª primaria', guardianIds: [guardians[1].id], notes: 'Un grande appassionato di matematica.', active: true },
    { id: uuid(), firstName: 'Emma', lastName: 'Costa', birthDate: '2018-02-08', school: 'Scuola Primaria Rodari', grade: '3ª primaria', guardianIds: [guardians[2].id], notes: '', active: true },
    { id: uuid(), firstName: 'Tommaso', lastName: 'Fontana', birthDate: '2017-06-03', school: 'Scuola Primaria Rodari', grade: '4ª primaria', guardianIds: [guardians[3].id], notes: 'Accordo con incontri personalizzati.', active: true },
  ];
  const agreements: State['agreements'] = children.map((c, i) => ({
    id: uuid(), childId: c.id, kind: i === 1 ? 'weekly' : i === 3 ? 'custom' : 'monthly',
    label: ['Percorso completo', 'Tre pomeriggi', 'Due pomeriggi', 'Pacchetto incontri'][i],
    amountCents: [22000, 6000, 16000, 9000][i], startsOn: first, endsOn: null, dueDay: 5,
  }));
  let state: State = { schemaVersion: 1, revision: 0, updatedAt: now(), demo: true, guardians, children, agreements, charges: [], payments: [], audit: [] };
  state = issueMonth(state, month);
  state = addCustomCharge(state, agreements[3].id, 'Laboratorio e supporto compiti', `${month}-15`, 9000);
  const sofia = state.charges.find(c => c.childId === children[0].id)!;
  state = addPayment(state, { chargeId: sofia.id, amountCents: 22000, paidOn: day < `${month}-05` ? day : `${month}-05`, method: 'bank', note: 'Pagamento dimostrativo' });
  const leo = state.charges.filter(c => c.childId === children[1].id)[0];
  state = addPayment(state, { chargeId: leo.id, amountCents: 3000, paidOn: addDays(first, 0), method: 'cash', note: 'Acconto dimostrativo' });
  return state;
}
