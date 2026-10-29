import { ArrowRight, CalendarDays } from 'lucide-react';
import { dateLabel, today, type State } from './domain';

/** Read-only view of actual due dates, using the same reference month as the ledger. */
export function DueCalendar({ state, month, onOpen }: { state: State; month: string; onOpen: () => void }) {
  const first = new Date(`${month}-01T12:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12)).getUTCDate();
  const heading = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
  const due = new Map<string, number>();
  state.charges.filter(c => c.dueDate.startsWith(month)).forEach(c => due.set(c.dueDate, (due.get(c.dueDate) ?? 0) + 1));
  return <section className="panel due-calendar" aria-label={`Calendario rette di ${heading}`}>
    <div className="calendar-heading"><CalendarDays size={19} strokeWidth={1.4}/><h2>{heading}</h2></div>
    <div className="calendar-week" aria-hidden="true">{['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, i) => <span key={i}>{day}</span>)}</div>
    <div className="calendar-days">
      {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} aria-hidden="true"/>)}
      {Array.from({ length: days }, (_, i) => {
        const date = `${month}-${String(i + 1).padStart(2, '0')}`;
        const count = due.get(date) ?? 0;
        const dueLabel = `${count} ${count === 1 ? 'retta' : 'rette'} in scadenza`;
        return <span key={date} className={`calendar-day ${date === today() ? 'is-today' : ''} ${count ? 'has-due' : ''}`} aria-current={date === today() ? 'date' : undefined} aria-label={`${dateLabel(date)}${count ? `, ${dueLabel}` : ''}`} title={count ? dueLabel : undefined}>{i + 1}{count > 0 && <i aria-hidden="true"/>}</span>;
      })}
    </div>
    <p className="calendar-legend"><span/> Rette in scadenza nel giorno</p>
    <button className="panel-bottom-button" onClick={onOpen}>Apri le rette del mese<ArrowRight size={14}/></button>
  </section>;
}
