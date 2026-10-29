import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { balance, childName, dateLabel, euro, kindLabel, methodLabel, today, type Agreement, type State } from './domain';
import { Field, type Mutate } from './dialogs';
import { childRemovalSummary, deleteAgreement, deleteCharge, deleteChild, deleteGuardian, deletePayment, resetArchive, resetFinance, setGuardianActive, updateAgreement, updateCharge, updatePayment } from './management';
import { parseMoney } from './domain';

export type ManagementSpec = { kind: 'manage'; action: 'delete-child' | 'delete-guardian' | 'guardian-status' | 'edit-agreement' | 'delete-agreement' | 'edit-charge' | 'delete-charge' | 'edit-payment' | 'delete-payment' | 'reset-finance' | 'reset-all'; id?: string };
const get = (form: FormData, name: string) => String(form.get(name) ?? '').trim();

export function ManagementDialog({ spec, state, busy, error, mutate, onClose }: { spec: ManagementSpec; state: State; busy: boolean; error: string; mutate: Mutate; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState('');
  useEffect(() => { ref.current?.showModal(); }, []);
  const destructive = spec.action.startsWith('delete-') || spec.action.startsWith('reset-');
  const word = spec.action.startsWith('reset-') ? 'AZZERA' : 'ELIMINA';
  let title = '', description = '', submitLabel = 'Salva modifiche', blocked = false;
  let fields: ReactNode = null;
  let change: (s: State, form: FormData) => State = s => s;

  if (spec.action === 'delete-child') {
    const summary = childRemovalSummary(state, spec.id!);
    title = 'Elimina il bambino'; submitLabel = 'Elimina bambino';
    description = `${childName(summary.child)} verrà rimosso dall’anagrafica insieme ai suoi accordi, alle rette e ai pagamenti. Gli altri bambini non vengono coinvolti.`;
    fields = <><div className="removal-summary"><span><strong>{summary.agreements}</strong>accordi</span><span><strong>{summary.charges}</strong>rette</span><span><strong>{summary.payments}</strong>pagamenti</span></div>{summary.unusedGuardians.length > 0 && <label className="confirm-check"><input type="checkbox" name="removeGuardians"/>Elimina anche i {summary.unusedGuardians.length} tutori che, dopo questa rimozione, non saranno collegati ad altri bambini.</label>}<p className="form-notice">I tutori condivisi con altri bambini saranno sempre conservati. Il diario delle operazioni resta consultabile.</p></>;
    change = (s, f) => deleteChild(s, spec.id!, f.has('removeGuardians'));
  }
  if (spec.action === 'delete-guardian') {
    const g = state.guardians.find(g => g.id === spec.id)!;
    const linked = state.children.filter(c => c.guardianIds.includes(g.id));
    const needsReplacement = linked.some(c => c.guardianIds.length === 1);
    const alternatives = state.guardians.filter(x => x.id !== g.id && x.active !== false);
    blocked = needsReplacement && !alternatives.length;
    title = 'Elimina il tutore'; submitLabel = 'Elimina tutore';
    description = `${g.name} verrà eliminato. Le schede dei bambini e tutti i loro movimenti resteranno disponibili.`;
    fields = <>{linked.length > 0 ? <><div className="inset"><p>Collegato a: {linked.map(childName).join(', ')}.</p></div><Field label="Tutore sostitutivo" hint={needsReplacement ? 'Obbligatorio: almeno un bambino ha solo questo tutore.' : 'Facoltativo. Senza sostituto saranno mantenuti gli altri tutori già collegati.'}><select name="replacement" required={needsReplacement} autoFocus><option value="">{needsReplacement ? 'Scegli un sostituto' : 'Nessun sostituto'}</option>{alternatives.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>{blocked && <p className="alert">Aggiungi prima un altro tutore oppure elimina le schede dei bambini interessati. Nessun bambino può rimanere senza una persona di riferimento.</p>}</> : <p className="form-notice">Questo tutore non è collegato a bambini.</p>}</>;
    change = (s, f) => deleteGuardian(s, g.id, get(f, 'replacement') || undefined);
  }
  if (spec.action === 'guardian-status') {
    const g = state.guardians.find(g => g.id === spec.id)!;
    const active = g.active === false;
    title = active ? 'Riattiva il tutore' : 'Archivia il tutore'; submitLabel = active ? 'Riattiva tutore' : 'Archivia tutore';
    description = active ? `${g.name} tornerà tra i contatti attivi.` : `${g.name} resterà nelle schede già collegate e nello storico. Potrai ritrovarlo con “Mostra archiviati” e riattivarlo quando serve.`;
    change = s => setGuardianActive(s, g.id, active);
  }
  if (spec.action === 'edit-agreement') {
    const a = state.agreements.find(a => a.id === spec.id)!;
    const issued = state.charges.some(c => c.agreementId === a.id);
    title = 'Sistema l’accordo'; description = 'Le rette già emesse mantengono il proprio importo. Questa tariffa sarà usata nelle prossime emissioni.';
    fields = <><Field label="Nome dell’accordo"><input name="label" required maxLength={120} defaultValue={a.label} autoFocus/></Field><div className="form-grid"><Field label="Tipo di accordo"><select name="kind" disabled={issued} defaultValue={a.kind}>{Object.entries(kindLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><Field label="Tariffa (€)"><input name="amount" inputMode="decimal" required defaultValue={(a.amountCents / 100).toFixed(2).replace('.', ',')}/></Field><Field label="Inizio validità"><input name="startsOn" type="date" required min="1900-01-01" max="2100-12-31" readOnly={issued} defaultValue={a.startsOn}/></Field><Field label="Fine validità (facoltativa)"><input name="endsOn" type="date" min="1900-01-01" max="2100-12-31" defaultValue={a.endsOn ?? ''}/></Field></div><Field label="Giorno di scadenza mensile"><input name="dueDay" type="number" required min={1} max={28} defaultValue={a.dueDay}/></Field>{issued && <p className="form-notice">Tipo e data iniziale restano fissi mentre ci sono rette collegate. Per correggere una retta esistente usa la sua matita; per cambiare il percorso puoi chiudere questo accordo e crearne uno nuovo.</p>}</>;
    change = (s, f) => updateAgreement(s, { ...a, label: get(f, 'label'), kind: issued ? a.kind : get(f, 'kind') as Agreement['kind'], startsOn: get(f, 'startsOn'), endsOn: get(f, 'endsOn') || null, amountCents: parseMoney(get(f, 'amount')), dueDay: Number(get(f, 'dueDay')) });
  }
  if (spec.action === 'delete-agreement') {
    const a = state.agreements.find(a => a.id === spec.id)!;
    const charges = state.charges.filter(c => c.agreementId === a.id);
    const ids = new Set(charges.map(c => c.id));
    title = 'Elimina l’accordo'; submitLabel = 'Elimina accordo';
    description = `${a.label} · ${kindLabel[a.kind]} · ${euro(a.amountCents)}.`;
    fields = <p className="form-notice">Saranno eliminati anche {charges.length} rette e {state.payments.filter(p => ids.has(p.chargeId)).length} pagamenti collegati. Il bambino e i tutori restano nell’anagrafica. Questo accordo non genererà altre rette.</p>;
    change = s => deleteAgreement(s, a.id);
  }
  if (spec.action === 'edit-charge' || spec.action === 'delete-charge') {
    const c = state.charges.find(c => c.id === spec.id)!;
    const received = balance(state, c).received;
    if (spec.action === 'edit-charge') {
      title = 'Sistema la retta'; description = `${childName(state.children.find(x => x.id === c.childId)!)} · ${c.label}. L’accordo e le altre rette restano invariati.`;
      fields = <><Field label="Descrizione della retta"><input name="label" required maxLength={200} defaultValue={c.label} autoFocus/></Field><div className="form-grid"><Field label="Scadenza"><input name="dueDate" type="date" required min="1900-01-01" max="2100-12-31" defaultValue={c.dueDate}/></Field><Field label="Importo della retta (€)" hint={`Già ricevuti ${euro(received)}. L’importo non può essere inferiore.`}><input name="amount" inputMode="decimal" required defaultValue={(c.amountCents / 100).toFixed(2).replace('.', ',')}/></Field></div></>;
      change = (s, f) => updateCharge(s, c.id, { label: get(f, 'label'), dueDate: get(f, 'dueDate'), amountCents: parseMoney(get(f, 'amount')) });
    } else {
      title = 'Elimina la retta'; submitLabel = 'Elimina retta'; description = `${c.label} · ${dateLabel(c.dueDate)} · ${euro(c.amountCents)}.`;
      fields = <><p className="form-notice">Saranno eliminati anche {state.payments.filter(p => p.chargeId === c.id).length} pagamenti collegati. Il saldo sarà ricalcolato.</p><p className="form-notice">Se l’accordo è ricorrente, questa retta potrà essere proposta di nuovo quando premi “Prepara rette”. Per interromperla definitivamente chiudi o elimina l’accordo.</p></>;
      change = s => deleteCharge(s, c.id);
    }
  }
  if (spec.action === 'edit-payment' || spec.action === 'delete-payment') {
    const p = state.payments.find(p => p.id === spec.id)!;
    const c = state.charges.find(c => c.id === p.chargeId)!;
    if (spec.action === 'edit-payment') {
      title = 'Sistema il pagamento'; description = `${childName(state.children.find(x => x.id === c.childId)!)} · ${c.label}. Il saldo viene ricalcolato al salvataggio.`;
      fields = <><div className="form-grid"><Field label="Importo ricevuto (€)"><input name="amount" inputMode="decimal" required defaultValue={(p.amountCents / 100).toFixed(2).replace('.', ',')} autoFocus/></Field><Field label="Data del pagamento"><input name="paidOn" type="date" required min="1900-01-01" max={today()} defaultValue={p.paidOn}/></Field></div><Field label="Metodo"><select name="method" defaultValue={p.method}>{Object.entries(methodLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><Field label="Nota"><textarea name="note" maxLength={1000} defaultValue={p.note}/></Field><p className="form-notice">Massimo assegnabile a questo pagamento: {euro(balance(state, c).remaining + p.amountCents)}. Per spostarlo su un’altra retta, eliminalo e registralo sulla retta corretta.</p></>;
      change = (s, f) => updatePayment(s, p.id, { amountCents: parseMoney(get(f, 'amount')), paidOn: get(f, 'paidOn'), method: get(f, 'method') as keyof typeof methodLabel, note: get(f, 'note') });
    } else {
      title = 'Elimina il pagamento'; submitLabel = 'Elimina pagamento'; description = `${euro(p.amountCents)} del ${dateLabel(p.paidOn)} · ${c.label}.`;
      fields = <p className="form-notice">Il movimento sarà rimosso dal registro. {p.voidedAt ? 'È già stornato: il residuo non cambia.' : 'Il relativo importo tornerà nel residuo da ricevere.'} Per conservarlo visibile nel registro puoi usare lo storno.</p>;
      change = s => deletePayment(s, p.id);
    }
  }
  if (spec.action === 'reset-finance' || spec.action === 'reset-all') {
    const all = spec.action === 'reset-all';
    title = all ? 'Riparti da zero' : 'Azzera rette e pagamenti'; submitLabel = all ? 'Svuota tutto' : 'Azzera rette e pagamenti';
    description = all ? 'L’archivio diventerà vuoto: bambini, tutori, accordi, rette, pagamenti e diario saranno rimossi. Gli esempi non verranno ricaricati alla riapertura.' : 'Tutte le rette e tutti i pagamenti saranno rimossi. Bambini, tutori, accordi e diario delle operazioni saranno conservati. Potrai emettere nuovamente le rette quando decidi tu.';
    fields = <div className="removal-summary"><span><strong>{all ? state.children.length : state.agreements.length}</strong>{all ? 'bambini' : 'accordi conservati'}</span><span><strong>{state.charges.length}</strong>rette da rimuovere</span><span><strong>{state.payments.length}</strong>pagamenti da rimuovere</span></div>;
    change = all ? s => resetArchive(s) : s => resetFinance(s);
  }
  const preserve = spec.action !== 'guardian-status';
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (blocked || busy) return;
    const form = new FormData(event.currentTarget);
    if (destructive && get(form, 'confirmation') !== word) return;
    if (await mutate(s => change(s, form), 'Archivio aggiornato', preserve ? title : undefined)) onClose();
  };
  return <dialog ref={ref} className="modal" aria-labelledby="management-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}><form onSubmit={submit}><div className="modal-heading"><div><p className="eyebrow">Memole's World</p><h2 id="management-title">{title}</h2></div><button type="button" className="icon-button" disabled={busy} onClick={onClose} aria-label="Chiudi finestra"><X size={20}/></button></div><p className="modal-description">{description}</p><div className="modal-fields">{fields}{preserve && <p className="backup-notice">Prima del salvataggio viene creata una copia di sicurezza. La ritrovi in “Il tuo archivio”, tra gli ultimi 5 punti di ripristino. Se la copia non riesce, l’operazione si ferma.</p>}{destructive && <Field label={`Scrivi ${word} per confermare`}><input name="confirmation" required autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder={word}/></Field>}</div>{error && <p className="alert" role="alert">{error}</p>}<footer className="modal-footer"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Annulla</button><button type="submit" className={`button ${destructive ? 'danger' : 'primary'}`} disabled={busy || blocked || (destructive && confirmation !== word)}>{busy ? 'Salvataggio…' : submitLabel}</button></footer></form></dialog>;
}
