import type { ReactNode } from 'react';
import { ArrowUpRight, ChevronRight, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { balance, childName, dateLabel, euro, totals, type Charge, type Child, type State } from './domain';

export function Avatar({ child, small = false }: { child: Child; small?: boolean }) {
  const hue = [...child.firstName].reduce((v, c) => v + c.charCodeAt(0), 0) % 4;
  return <span className={`avatar hue-${hue} ${small ? 'small' : ''}`} aria-hidden="true">{child.firstName[0]}{child.lastName[0]}</span>;
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><Sparkles size={25} strokeWidth={1.3} /><h3>{title}</h3>{children && <p>{children}</p>}</div>;
}
export function MonthPicker({ value, onChange, onShift }: { value: string; onChange: (month: string) => void; onShift: (offset: number) => void }) {
  const [year, month] = value.split('-');
  return <div className="month-picker"><button className="icon-button" onClick={() => onShift(-1)} aria-label="Mese precedente">‹</button>
    <select aria-label="Mese di riferimento" value={month} onChange={e => onChange(`${year}-${e.target.value}`)}>{Array.from({ length: 12 }, (_, i) => { const m = String(i + 1).padStart(2, '0'); return <option key={m} value={m}>{new Intl.DateTimeFormat('it-IT', { month: 'long', timeZone: 'UTC' }).format(new Date(`2026-${m}-01T12:00:00Z`))}</option>; })}</select>
    <select aria-label="Anno di riferimento" value={year} onChange={e => onChange(`${e.target.value}-${month}`)}>{Array.from({ length: 201 }, (_, i) => <option key={i} value={String(1900 + i)}>{1900 + i}</option>)}</select>
    <button className="icon-button" onClick={() => onShift(1)} aria-label="Mese successivo">›</button></div>;
}
export function SectionHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return <div className="section-head"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div><div className="actions">{children}</div></div>;
}
export function Metrics({ state, month, childId }: { state: State; month: string; childId?: string }) {
  const t = totals(state, month, childId);
  const percent = t.expected ? Math.round(t.received / t.expected * 100) : 0;
  return <div className="metrics">
    <article className="metric"><span>Previsto nel mese</span><strong data-testid="expected">{euro(t.expected)}</strong><small>Scadenze emesse</small><span className="metric-symbol">↗</span></article>
    <article className="metric"><span>Ricevuto sulle rette</span><strong data-testid="received">{euro(t.received)}</strong><small>{percent}% del previsto coperto</small><span className="metric-symbol mint">✓</span></article>
    <article className="metric"><span>Ancora da ricevere</span><strong data-testid="remaining">{euro(t.remaining)}</strong><small>Residuo delle rette del mese</small><span className="metric-symbol peach">◷</span></article>
  </div>;
}
export function ChargeTable({ state, charges, onPay, onChild, onEdit, onDelete }: { state: State; charges: Charge[]; onPay: (id: string) => void; onChild?: (id: string) => void; onEdit?: (id: string) => void; onDelete?: (id: string) => void }) {
  if (!charges.length) return <Empty title="Qui è tutto pronto per iniziare">Emetti le rette del mese oppure aggiungi una scadenza personalizzata.</Empty>;
  return <div className="table-wrap"><table><thead><tr><th>Bambino e scadenza</th><th>Data</th><th>Previsto</th><th>Residuo</th><th>Stato</th><th><span className="sr-only">Azioni</span></th></tr></thead><tbody>
    {[...charges].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.label.localeCompare(b.label)).map(c => {
      const child = state.children.find(x => x.id === c.childId)!;
      const b = balance(state, c);
      return <tr key={c.id}><td><div className="person-cell"><Avatar child={child} small /><div>{onChild ? <button className="text-button name" onClick={() => onChild(child.id)}>{childName(child)}</button> : <strong>{childName(child)}</strong>}<small>{c.label}</small></div></div></td>
        <td className="nowrap">{dateLabel(c.dueDate)}</td><td className="money">{euro(c.amountCents)}</td><td className="money">{euro(b.remaining)}</td>
        <td><span className={`badge ${b.remaining === 0 ? 'green' : b.received ? 'orange' : 'neutral'}`}>{b.remaining === 0 ? 'Saldato' : b.received ? 'Acconto' : 'Da ricevere'}</span></td>
        <td><div className="row-actions">{b.remaining > 0 && <button className="icon-button" aria-label={`Registra pagamento ${childName(child)} ${c.label}`} title="Registra pagamento" onClick={() => onPay(c.id)}><ArrowUpRight size={18} /></button>}{onEdit && <button className="icon-button" aria-label={`Modifica retta ${childName(child)} ${c.label}`} title="Modifica retta" onClick={() => onEdit(c.id)}><Pencil size={16}/></button>}{onDelete && <button className="icon-button danger-text" aria-label={`Elimina retta ${childName(child)} ${c.label}`} title="Elimina retta" onClick={() => onDelete(c.id)}><Trash2 size={16}/></button>}</div></td></tr>;
    })}
  </tbody></table></div>;
}
export function GardenArt() {
  return <svg className="garden-art" viewBox="0 0 440 260" fill="none" aria-hidden="true">
    <defs><linearGradient id="arch" x1="220" y1="20" x2="220" y2="260" gradientUnits="userSpaceOnUse"><stop stopColor="#e8d5bb"/><stop offset="1" stopColor="#f0e8d6"/></linearGradient></defs>
    <path d="M128 260V124a92 92 0 0 1 184 0v136" fill="url(#arch)"/>
    <circle cx="260" cy="94" r="24" fill="#f8f3dd"/>
    <path d="M111 237c67-55 116-68 210-15v38H111Z" fill="#b6c0a1"/>
    <path d="M119 260c70-72 132-67 211-22v22Z" fill="#788d70"/>
    <path d="M197 260c-12-23 22-33 20-48s-23-14-15-27" stroke="#e9d8ac" strokeWidth="16"/>
    <path d="M72 246c21-49 27-110 13-167m0 29c-27-4-40-23-36-43 24 2 38 15 36 43Zm2 34c24-5 38-22 36-42-25 0-39 18-36 42Zm-4 36c-30-5-43-21-41-43 27 1 43 16 41 43Zm-7 29c24-2 42-16 43-34-25-4-40 9-43 34Z" stroke="#647f64" strokeWidth="3" fill="#9aab84"/>
    <path d="M348 260c-8-58 5-113 30-145m-18 36c-2-24 7-41 25-45 7 18-6 36-25 45Zm-9 33c-21-9-31-26-27-43 22 5 30 21 27 43Zm-3 33c20-2 37-14 40-32-23-4-38 9-40 32Z" stroke="#647f64" strokeWidth="3" fill="#a9b796"/>
    <path d="m324 59 3 8 8 3-8 3-3 8-3-8-8-3 8-3ZM112 52l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#a58350"/>
    <path d="m155 108 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#fff9e4"/>
    <circle cx="340" cy="110" r="3" fill="#c5a674"/><circle cx="100" cy="220" r="3" fill="#c5a674"/>
  </svg>;
}
export function ChildOverview({ state, month, onChild }: { state: State; month: string; onChild: (id: string) => void }) {
  return <div className="child-overview">{state.children.filter(c => c.active).map(child => {
    const t = totals(state, month, child.id);
    return <button className="child-overview-row" onClick={() => onChild(child.id)} key={child.id}><Avatar child={child} small /><span className="grow"><strong>{childName(child)}</strong><small>{child.grade || 'Classe da aggiungere'}</small></span><span className="mini-balance"><strong>{euro(t.remaining)}</strong><small>{t.expected ? 'da ricevere' : 'nessuna retta emessa'}</small></span><ChevronRight size={16}/></button>;
  })}</div>;
}
