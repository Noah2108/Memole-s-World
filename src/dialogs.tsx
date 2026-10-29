import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactElement, ReactNode } from 'react';
import { X } from 'lucide-react';
import { addAgreement, addCustomCharge, addDays, addPayment, balance, childName, closeAgreement, dateLabel, euro, issueMonth, kindLabel, methodLabel, parseMoney, plannedCharges, restoreState, saveChild, saveGuardian, setChildActive, today, uuid, voidPayment, type Agreement, type Child, type Guardian, type State } from './domain';

export type Mutate = (change: (state: State) => State, message?: string, safetyLabel?: string) => Promise<boolean>;
export type Dialog =
  | { kind: 'child'; child?: Child }
  | { kind: 'guardian'; guardian?: Guardian }
  | { kind: 'agreement'; childId: string }
  | { kind: 'payment'; chargeId?: string }
  | { kind: 'custom'; agreementId?: string }
  | { kind: 'close'; agreementId: string }
  | { kind: 'void'; paymentId: string }
  | { kind: 'archive'; child: Child }
  | { kind: 'issue' }
  | { kind: 'restore'; imported: State };

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const inputId = useId(), hintId = `${inputId}-hint`;
  const control = isValidElement(children) ? cloneElement(children as ReactElement<{ id?: string; 'aria-describedby'?: string }>, { id: inputId, 'aria-describedby': hint ? hintId : undefined }) : children;
  return <div className="field"><label htmlFor={inputId}>{label}</label>{control}{hint && <small id={hintId}>{hint}</small>}</div>;
}
const value = (f: FormData, name: string) => String(f.get(name) ?? '').trim();

export function ActionDialog({ dialog, state, month, busy, mutate, error, onClose }: { dialog: Dialog; state: State; month: string; busy: boolean; mutate: Mutate; error: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [choice, setChoice] = useState(dialog.kind === 'payment' ? dialog.chargeId ?? '' : dialog.kind === 'custom' ? dialog.agreementId ?? '' : '');
  const [guardianMode, setGuardianMode] = useState(dialog.kind === 'child' && dialog.child ? 'existing' : 'new');
  useEffect(() => { ref.current?.showModal(); }, []);
  let title = '', description = '', submitLabel = 'Salva', fields: ReactNode = null;
  let change: (s: State, f: FormData) => State = s => s;

  if (dialog.kind === 'guardian') {
    const g = dialog.guardian;
    title = g ? 'Modifica tutore' : 'Un nuovo tutore';
    description = 'Una persona di riferimento, anche per più fratelli.';
    fields = <><Field label="Nome e cognome"><input name="name" required minLength={2} maxLength={160} defaultValue={g?.name} autoFocus /></Field><div className="form-grid"><Field label="Relazione"><input name="relationship" required maxLength={80} placeholder="Es. Mamma, Papà, Tutore" defaultValue={g?.relationship} /></Field><Field label="Telefono"><input name="phone" type="tel" maxLength={60} defaultValue={g?.phone} /></Field></div><Field label="Email"><input name="email" type="email" maxLength={254} defaultValue={g?.email} /></Field><Field label="Note"><textarea name="notes" maxLength={1000} defaultValue={g?.notes} /></Field></>;
    change = (s, f) => saveGuardian(s, { id: g?.id ?? uuid(), name: value(f, 'name'), relationship: value(f, 'relationship'), phone: value(f, 'phone'), email: value(f, 'email'), notes: value(f, 'notes') });
  }
  if (dialog.kind === 'child') {
    const c = dialog.child;
    title = c ? 'Modifica bambino' : 'Un nuovo piccolo mondo';
    description = 'Cominciamo dalle informazioni essenziali e dalla famiglia.';
    fields = <><div className="form-grid"><Field label="Nome"><input name="firstName" required maxLength={80} defaultValue={c?.firstName} autoFocus /></Field><Field label="Cognome"><input name="lastName" required maxLength={80} defaultValue={c?.lastName} /></Field><Field label="Data di nascita"><input name="birthDate" type="date" min="1900-01-01" max={today()} defaultValue={c?.birthDate} /></Field><Field label="Classe"><input name="grade" maxLength={60} placeholder="Es. 3ª primaria" defaultValue={c?.grade} /></Field></div><Field label="Scuola"><input name="school" maxLength={160} defaultValue={c?.school} /></Field>
      <Field label="Tutori"><select aria-label="Modalità tutori" value={guardianMode} onChange={e => setGuardianMode(e.target.value)}><option value="new">Crea un nuovo tutore</option><option value="existing">Collega tutori già presenti</option></select></Field>
      {guardianMode === 'new' ? <div className="inset form-grid"><Field label="Nome e cognome del tutore"><input name="guardianName" required minLength={2} maxLength={160} /></Field><Field label="Relazione"><input name="guardianRelationship" required defaultValue="Genitore" maxLength={80} /></Field><Field label="Telefono del tutore"><input name="guardianPhone" type="tel" maxLength={60} /></Field><Field label="Email del tutore"><input name="guardianEmail" type="email" maxLength={254} /></Field></div> : <fieldset className="check-list"><legend>Seleziona almeno un tutore</legend>{state.guardians.filter(g => g.active !== false || c?.guardianIds.includes(g.id)).map(g => <label key={g.id}><input type="checkbox" name="guardianIds" value={g.id} defaultChecked={c?.guardianIds.includes(g.id)} />{g.name}<small>{g.active === false ? 'Archiviato' : g.relationship}</small></label>)}</fieldset>}
      <Field label="Note sul percorso"><textarea name="notes" maxLength={1000} defaultValue={c?.notes} /></Field></>;
    change = (s, f) => {
      let next = s;
      let ids = f.getAll('guardianIds').map(String);
      if (guardianMode === 'new') {
        const g: Guardian = { id: uuid(), name: value(f, 'guardianName'), relationship: value(f, 'guardianRelationship'), phone: value(f, 'guardianPhone'), email: value(f, 'guardianEmail'), notes: '' };
        next = saveGuardian(next, g); ids = [...(c?.guardianIds ?? []), g.id];
      }
      if (!ids.length) throw new Error('Seleziona almeno un tutore');
      return saveChild(next, { id: c?.id ?? uuid(), firstName: value(f, 'firstName'), lastName: value(f, 'lastName'), birthDate: value(f, 'birthDate'), school: value(f, 'school'), grade: value(f, 'grade'), guardianIds: ids, notes: value(f, 'notes'), active: c?.active ?? true });
    };
  }
  if (dialog.kind === 'agreement') {
    title = 'Un accordo su misura'; description = 'Ogni bambino ha il suo percorso. Gli accordi precedenti restano nello storico.';
    const latest = state.charges.filter(c => c.childId === dialog.childId).map(c => c.periodEnd).sort().at(-1);
    const start = latest ? addDays(latest, 1) : today();
    fields = <><Field label="Nome dell’accordo"><input name="label" required maxLength={120} placeholder="Es. Tre pomeriggi a settimana" autoFocus /></Field><div className="form-grid"><Field label="Tipo di accordo"><select name="kind" defaultValue="monthly">{Object.entries(kindLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><Field label="Importo (€)" hint="Per settimana, mese o singola scadenza personalizzata."><input name="amount" required inputMode="decimal" placeholder="Es. 180,00" /></Field><Field label="Inizio validità"><input name="startsOn" type="date" required min="1900-01-01" max="2100-12-31" defaultValue={start} /></Field><Field label="Fine validità (facoltativa)"><input name="endsOn" type="date" min="1900-01-01" max="2100-12-31" /></Field></div><Field label="Giorno di scadenza mensile" hint="Solo per il mensile fisso. Il settimanale scade ogni 7 giorni dall’inizio."><input name="dueDay" type="number" required min={1} max={28} defaultValue={5} /></Field><p className="form-notice">Prima di cambiare tariffa, chiudi l’accordo precedente. Gli intervalli non possono sovrapporsi; le rette già emesse non vengono riscritte. Il mensile è intero anche per mesi parziali.</p></>;
    change = (s, f) => addAgreement(s, { id: uuid(), childId: dialog.childId, label: value(f, 'label'), kind: value(f, 'kind') as Agreement['kind'], amountCents: parseMoney(value(f, 'amount')), startsOn: value(f, 'startsOn'), endsOn: value(f, 'endsOn') || null, dueDay: Number(value(f, 'dueDay')) });
  }
  if (dialog.kind === 'payment') {
    title = 'Registra un pagamento'; description = 'Un acconto o un saldo: tutto trova il suo posto.'; submitLabel = 'Registra pagamento';
    const open = state.charges.filter(c => balance(state, c).remaining > 0);
    const selected = open.find(c => c.id === choice);
    fields = <><Field label="Scadenza da pagare"><select name="chargeId" required value={choice} onChange={e => setChoice(e.target.value)} autoFocus><option value="">Scegli una scadenza</option>{open.map(c => <option key={c.id} value={c.id}>{childName(state.children.find(x => x.id === c.childId)!)} · {c.label} · {euro(balance(state, c).remaining)}</option>)}</select></Field>
      {selected && <div className="payment-recap"><span>Residuo della scadenza</span><strong>{euro(balance(state, selected).remaining)}</strong></div>}
      <div className="form-grid"><Field label="Importo ricevuto (€)"><input key={choice} name="amount" required inputMode="decimal" defaultValue={selected ? (balance(state, selected).remaining / 100).toFixed(2).replace('.', ',') : ''} /></Field><Field label="Data del pagamento"><input name="paidOn" type="date" required min="1900-01-01" max={today()} defaultValue={today()} /></Field></div><Field label="Metodo"><select name="method">{Object.entries(methodLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><Field label="Nota (facoltativa)"><textarea name="note" maxLength={1000} placeholder="Es. Acconto consegnato dal genitore" /></Field><p className="form-notice">Il pagamento viene assegnato a questa scadenza. Puoi registrare un importo parziale, fino al residuo.</p></>;
    change = (s, f) => addPayment(s, { chargeId: value(f, 'chargeId'), amountCents: parseMoney(value(f, 'amount')), paidOn: value(f, 'paidOn'), method: value(f, 'method') as keyof typeof methodLabel, note: value(f, 'note') });
  }
  if (dialog.kind === 'custom') {
    title = 'Una scadenza personalizzata'; description = 'Per pacchetti, incontri e accordi che hanno un ritmo tutto loro.'; submitLabel = 'Crea scadenza';
    const agreements = state.agreements.filter(a => a.kind === 'custom' && state.children.find(c => c.id === a.childId)?.active);
    const selected = agreements.find(a => a.id === choice);
    fields = <><Field label="Accordo personalizzato"><select name="agreementId" required value={choice} onChange={e => setChoice(e.target.value)} autoFocus><option value="">Scegli un accordo</option>{agreements.map(a => <option key={a.id} value={a.id}>{childName(state.children.find(c => c.id === a.childId)!)} · {a.label}</option>)}</select></Field>{!agreements.length && <p className="form-notice">Crea prima un accordo personalizzato nella scheda di un bambino.</p>}<Field label="Descrizione"><input name="label" required maxLength={200} placeholder="Es. Pacchetto 4 incontri" /></Field><div className="form-grid"><Field label="Scadenza"><input name="dueDate" type="date" required min={selected?.startsOn ?? '1900-01-01'} max={selected?.endsOn ?? '2100-12-31'} defaultValue={today()} /></Field><Field label="Importo (€)"><input key={choice} name="amount" required inputMode="decimal" defaultValue={selected ? (selected.amountCents / 100).toFixed(2).replace('.', ',') : ''} /></Field></div></>;
    change = (s, f) => addCustomCharge(s, value(f, 'agreementId'), value(f, 'label'), value(f, 'dueDate'), parseMoney(value(f, 'amount')));
  }
  if (dialog.kind === 'close') {
    const a = state.agreements.find(a => a.id === dialog.agreementId)!;
    const latest = state.charges.filter(c => c.agreementId === a.id).map(c => c.periodEnd).sort().at(-1);
    title = 'Chiudi questo accordo'; description = `${a.label}. Le scadenze e i pagamenti già registrati restano disponibili.`; submitLabel = 'Chiudi accordo';
    fields = <Field label="Ultimo giorno di validità" hint={latest ? `Le rette emesse arrivano al ${dateLabel(latest)}.` : 'Dopo questa data potrai aprire un nuovo accordo.'}><input name="endsOn" type="date" required min={latest ?? a.startsOn} max="2100-12-31" defaultValue={latest && latest > today() ? latest : today() < a.startsOn ? a.startsOn : today()} autoFocus /></Field>;
    change = (s, f) => closeAgreement(s, a.id, value(f, 'endsOn'));
  }
  if (dialog.kind === 'void') {
    const p = state.payments.find(p => p.id === dialog.paymentId)!;
    title = 'Storna il pagamento'; description = `${euro(p.amountCents)} del ${dateLabel(p.paidOn)}. Lo storno riapre il residuo e conserva il movimento originale.`; submitLabel = 'Conferma storno';
    fields = <Field label="Motivo dello storno"><textarea name="reason" required minLength={3} maxLength={1000} autoFocus /></Field>;
    change = (s, f) => voidPayment(s, p.id, value(f, 'reason'));
  }
  if (dialog.kind === 'archive') {
    title = dialog.child.active ? 'Archivia il percorso' : 'Riattiva il percorso';
    description = dialog.child.active ? `${childName(dialog.child)} non avrà nuove rette automatiche. Anagrafica, accordi e movimenti rimarranno consultabili.` : `${childName(dialog.child)} tornerà tra i bambini attivi. Controlla la validità dell’accordo prima di emettere nuove rette.`;
    submitLabel = dialog.child.active ? 'Archivia bambino' : 'Riattiva bambino';
    change = s => setChildActive(s, dialog.child.id, !dialog.child.active);
  }
  if (dialog.kind === 'issue') {
    const pending = plannedCharges(state, month);
    title = 'Prepara le rette del mese'; description = 'Le scadenze sono calcolate dagli accordi di ogni bambino. Quelle già emesse sono al sicuro.'; submitLabel = pending.length ? 'Emetti scadenze' : 'Tutto già preparato';
    fields = <><div className="payment-recap"><span>{pending.length} nuove scadenze · {month}</span><strong>{euro(pending.reduce((v, c) => v + c.amountCents, 0))}</strong></div><p className="form-notice">Mensili e settimanali vengono emessi insieme. Gli accordi personalizzati richiedono una scadenza manuale.</p>{pending.length > 0 && <ul className="preview-list">{pending.map(c => <li key={c.key}><span>{childName(state.children.find(x => x.id === c.childId)!)}<small>{dateLabel(c.dueDate)}</small></span><strong>{euro(c.amountCents)}</strong></li>)}</ul>}</>;
    change = s => issueMonth(s, month);
  }
  if (dialog.kind === 'restore') {
    title = 'Ripristina questo backup'; description = 'Il backup sostituirà l’archivio demo corrente. Prima del ripristino verrà conservata una copia locale della versione attuale.'; submitLabel = 'Sostituisci archivio';
    fields = <><div className="inset"><p>{dialog.imported.children.length} bambini · {dialog.imported.guardians.length} tutori</p><p>{dialog.imported.charges.length} scadenze · {dialog.imported.payments.length} pagamenti</p></div><label className="confirm-check"><input type="checkbox" required />Ho controllato il riepilogo e voglio sostituire i dati attuali.</label></>;
    change = s => restoreState(s, dialog.imported);
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    if (await mutate(s => change(s, data), undefined, dialog.kind === 'restore' ? 'Prima del ripristino' : undefined)) onClose();
  };
  return <dialog ref={ref} className="modal" aria-labelledby="dialog-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}><form onSubmit={submit}><div className="modal-heading"><div><p className="eyebrow">Memole's World</p><h2 id="dialog-title">{title}</h2></div><button type="button" className="icon-button" onClick={onClose} disabled={busy} aria-label="Chiudi finestra"><X size={20} /></button></div><p className="modal-description">{description}</p><div className="modal-fields">{fields}</div>{error && <p className="alert" role="alert">{error}</p>}<footer className="modal-footer"><button type="button" className="button secondary" onClick={onClose} disabled={busy}>Annulla</button><button type="submit" className="button primary" disabled={busy}>{busy ? 'Salvataggio…' : submitLabel}</button></footer></form></dialog>;
}
