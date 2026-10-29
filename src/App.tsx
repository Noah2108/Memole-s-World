import { useEffect, useRef, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, Download, FolderHeart, History, LayoutDashboard, Leaf, Mail, Pencil, Plus, Search, ShieldCheck, Sparkles, Trash2, Upload, Users, Wallet, X } from 'lucide-react';
import { z } from 'zod';
import { createDemo } from './demo';
import { balance, childName, dateLabel, euro, kindLabel, methodLabel, plannedCharges, today, totals, type State } from './domain';
import { createRepository, exportBackup, readBackupFile, type Repository, type SafetyCopy } from './persistence';
import { Avatar, ChargeTable, ChildOverview, Empty, Metrics, MonthPicker, SectionHead } from './components';
import { ActionDialog, type Dialog, type Mutate } from './dialogs';
import { ManagementDialog, type ManagementSpec } from './ManagementDialog';
import { ArchiveManagement } from './ArchiveManagement';
import { DueCalendar } from './DueCalendar';

type Page = 'dashboard' | 'children' | 'guardians' | 'ledger' | 'history' | 'archive';
const pages = [
  { id: 'dashboard', label: 'Panoramica', icon: LayoutDashboard },
  { id: 'children', label: 'Bambini', icon: BookOpen },
  { id: 'guardians', label: 'Genitori e tutori', icon: Users },
  { id: 'ledger', label: 'Rette e pagamenti', icon: Wallet },
  { id: 'history', label: 'Storico', icon: History },
  { id: 'archive', label: 'Il tuo archivio', icon: FolderHeart },
] as const;
const subtitles: Record<Page, string> = {
  dashboard: 'Bambini, famiglie e piccoli traguardi. Tutto nel tuo spazio.',
  children: 'Ogni percorso ha una storia. Qui trovi le persone da accompagnare.',
  guardians: 'I contatti di famiglia, sempre a portata di mano.',
  ledger: 'Accordi, scadenze e pagamenti. Con la tranquillità di avere il quadro completo.',
  history: 'Ogni pagamento e ogni operazione, da ritrovare quando serve.',
  archive: 'Le tue copie, i tuoi dati e lo spazio per ricominciare.',
};
const monthLabel = (m: string) => new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${m}-01T12:00:00Z`));
const timestampLabel = (value: string) => new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
async function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  if (!isTauri() && navigator.locks) return navigator.locks.request('memoles-world-archive', fn);
  return fn();
}
function errorText(error: unknown) {
  if (error instanceof z.ZodError) return error.issues.map(i => i.message).join(' · ');
  return error instanceof Error ? error.message : String(error);
}

export default function App() {
  const [state, setState] = useState<State | null>(null);
  const [startupError, setStartupError] = useState('');
  const [page, setPage] = useState<Page>('dashboard');
  const [month, setMonth] = useState(today().slice(0, 7));
  const [search, setSearch] = useState('');
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showArchivedGuardians, setShowArchivedGuardians] = useState(false);
  const [safetyCopies, setSafetyCopies] = useState<SafetyCopy[]>([]);
  const [safetyError, setSafetyError] = useState('');
  const [ledgerChild, setLedgerChild] = useState('');
  const [ledgerStatus, setLedgerStatus] = useState('all');
  const [dialog, setDialog] = useState<Dialog | ManagementSpec | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const repo = useRef<Repository | null>(null);
  const working = useRef(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void exclusive(async () => {
      repo.current = await createRepository();
      let loaded = await repo.current.load();
      if (!loaded) { loaded = createDemo(); await repo.current.save(loaded, null); }
      setState(loaded);
    }).catch(e => setStartupError(errorText(e)));
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (page !== 'archive' || !repo.current || !state) return;
    let live = true;
    void repo.current.safetyCopies().then(copies => { if (live) { setSafetyCopies(copies); setSafetyError(''); } }).catch(e => { if (live) setSafetyError(errorText(e)); });
    return () => { live = false; };
  }, [page, state?.revision]);
  const mutate: Mutate = async (change, message = 'Salvato nel tuo archivio', safetyLabel) => {
    if (!state || !repo.current || working.current) return false;
    working.current = true; setBusy(true); setError('');
    try {
      await exclusive(async () => {
        const next = change(state);
        if (next === state) return;
        await repo.current!.save(next, state.revision, safetyLabel);
        setState(next);
        setDialog(null);
        if (selectedChild && !next.children.some(c => c.id === selectedChild)) setSelectedChild(null);
        if (ledgerChild && !next.children.some(c => c.id === ledgerChild)) setLedgerChild('');
      });
      setNotice(message); return true;
    } catch (e) { setError(errorText(e)); return false; }
    finally { working.current = false; setBusy(false); }
  };
  const navigate = (next: Page) => { setPage(next); setSelectedChild(null); setSearch(''); setError(''); };
  const openChild = (id: string) => { setPage('children'); setSelectedChild(id); setSearch(''); };
  const openDialog = (d: Dialog | ManagementSpec) => { setError(''); setDialog(d); };
  const doExport = async () => {
    if (!state) return;
    try { if (await exportBackup(state)) setNotice('Backup esportato'); }
    catch (e) { setError(`Backup non esportato: ${errorText(e)}`); }
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try { openDialog({ kind: 'restore', imported: await readBackupFile(file) }); }
    catch (e) { setError(errorText(e)); }
  };
  if (!state) return <div className="startup"><img src="/app-icon.svg" width={76} alt="" /><h1>Bentornata Hoara</h1>{startupError ? <><p role="alert">{startupError}</p><p>Conserva i file attuali. Segui la guida di recupero fornita con l’app per usare la copia precedente.</p><button className="button primary" onClick={() => location.reload()}>Riprova</button></> : <p>Prepariamo il tuo piccolo mondo…</p>}</div>;

  const pending = plannedCharges(state, month);
  const visibleChildren = state.children.filter(c => (showArchived || c.active) && `${childName(c)} ${c.school} ${c.grade}`.toLocaleLowerCase('it').includes(search.toLocaleLowerCase('it')));
  const visibleGuardians = state.guardians.filter(g => showArchivedGuardians || g.active !== false);
  const child = state.children.find(c => c.id === selectedChild);
  const monthCharges = state.charges.filter(c => c.dueDate.startsWith(month));
  const cashInMonth = state.payments.filter(p => !p.voidedAt && p.paidOn.startsWith(month)).reduce((v, p) => v + p.amountCents, 0);
  const overdue = state.charges.filter(c => c.dueDate < today() && balance(state, c).remaining > 0);
  const activeCount = state.children.filter(c => c.active).length;
  const shiftMonth = (offset: number) => {
    const d = new Date(`${month}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + offset);
    const next = d.toISOString().slice(0, 7); if (next >= '1900-01' && next <= '2100-12') setMonth(next);
  };

  return <div className="app-shell">
    <aside className="sidebar"><button className="brand" onClick={() => navigate('dashboard')} aria-label="Memole's World, panoramica"><img src="/app-icon.svg" alt="" /><span>Memole's<br/><strong>World</strong></span></button><p className="sidebar-caption">CRESCERE INSIEME, OGNI GIORNO</p>
      <nav aria-label="Navigazione principale">{pages.map(p => <button key={p.id} className={`nav-item ${page === p.id ? 'active' : ''}`} onClick={() => navigate(p.id)} aria-label={p.label} aria-current={page === p.id ? 'page' : undefined}><p.icon size={19} strokeWidth={1.6}/><span>{p.label}</span>{p.id === 'children' && <small>{activeCount}</small>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-quote"><Leaf size={22} strokeWidth={1.2}/><p>Ogni piccolo passo<br/>merita cura.</p></div><div className="profile"><span>H</span><div><strong>Hoara</strong><small>Il tuo doposcuola</small></div><Sparkles size={15}/></div><small className="version">Memole's World · v0.1.3</small></div>
    </aside>
    <div className="workspace"><header className="toolbar"><div className="breadcrumb"><span>Il tuo spazio</span><ChevronRight size={13}/><strong>{pages.find(p => p.id === page)?.label}</strong></div><div className="toolbar-right"><label className="search"><Search size={16}/><input aria-label="Cerca un bambino" placeholder="Cerca un bambino…" value={search} onChange={e => { setSearch(e.target.value); setPage('children'); setSelectedChild(null); }}/><kbd>⌕</kbd></label><span className="saved"><span className={busy ? 'saving-dot' : ''}/>{busy ? 'Salvataggio…' : 'Archivio locale'}</span></div></header>
    <main id="main-content"><div className="page-heading"><div><p className="eyebrow">UN POSTO PER OGNI PICCOLA STORIA</p><h1>{child && page === 'children' ? childName(child) : { dashboard: 'Bentornata Hoara', children: 'I nostri bambini', guardians: 'Le loro persone speciali', ledger: 'Tutto al suo posto', history: 'Una storia che resta', archive: 'Il tuo archivio, con cura' }[page]}</h1><p className="page-subtitle">{child && page === 'children' ? 'La sua famiglia, i suoi accordi e ogni piccolo passo.' : subtitles[page]}</p></div><MonthPicker value={month} onChange={setMonth} onShift={shiftMonth}/></div>
    <div className="demo-strip"><Sparkles size={14}/><span>Il tuo spazio di prova</span><span className="demo-strip-detail">Dati dimostrativi · Le modifiche vengono salvate su questo dispositivo.</span></div>
    {error && !dialog && <div className="alert" role="alert">{error}<button className="icon-button" onClick={() => setError('')} aria-label="Chiudi messaggio"><X size={15}/></button></div>}

    {page === 'dashboard' && <>
      <div className="dashboard-layout"><div className="dashboard-primary"><section className="welcome"><div className="welcome-copy"><span className="welcome-kicker"><span/>IL TUO DOPOSCUOLA, CON IL CUORE</span><h2>Piccoli passi,<br/><em>grandi storie.</em></h2><p>Più spazio per accompagnare i bambini.<br/>A tenere tutto in ordine, ci pensiamo qui.</p><div className="welcome-actions"><button className="button primary" onClick={() => openDialog({ kind: 'payment' })}><Plus size={16}/>Registra un pagamento</button><button className="text-button" onClick={() => navigate('children')}>Apri le schede<ArrowRight size={14}/></button></div></div></section>
      <SectionHead eyebrow={monthLabel(month)} title="Il mese, a colpo d’occhio"><button className="text-button" onClick={() => openDialog({ kind: 'issue' })}>{pending.length ? `Prepara ${pending.length} scadenze` : 'Verifica rette del mese'}<ArrowRight size={15}/></button></SectionHead>
      <Metrics state={state} month={month}/><p className="metric-footnote">Ricevuto e residuo si riferiscono alle rette con scadenza nel mese. Incassi datati nel mese: <strong>{euro(cashInMonth)}</strong>.</p>
      <section className="panel"><SectionHead title="I piccoli mondi di oggi"><span className="count-pill">{activeCount} bambini</span></SectionHead><ChildOverview state={state} month={month} onChild={openChild}/>{!activeCount && <Empty title="Il primo percorso inizia qui"/>}<button className="panel-bottom-button" onClick={() => navigate('children')}>Tutte le schede<ArrowRight size={15}/></button></section></div><div className="dashboard-aside"><DueCalendar state={state} month={month} onOpen={() => { setLedgerStatus('all'); setLedgerChild(''); navigate('ledger'); }}/><section className="panel reminders"><div className="section-head"><h2>Da tenere a mente</h2><Leaf size={20} strokeWidth={1.3}/></div><div className="reminder"><span className="reminder-number">{overdue.length}</span><div><h3>Scadenze da ritrovare</h3><p>{euro(overdue.reduce((v, c) => v + balance(state, c).remaining, 0))} ancora aperti prima di oggi, in tutti i mesi.</p><button className="text-button" onClick={() => { setPage('ledger'); setLedgerStatus('overdue'); }}>Vedi le scadenze<ArrowRight size={14}/></button></div></div><div className="reminder"><span className="reminder-icon"><ShieldCheck size={22}/></span><div><h3>Un piccolo gesto di cura</h3><p>Esporta un backup per tenere una copia dei tuoi dati anche fuori dall’app.</p><button className="text-button" onClick={() => void doExport()}>Esporta backup<Download size={14}/></button></div></div></section></div></div>
    </>}

    {page === 'children' && !child && <>
      <SectionHead title={`${visibleChildren.length} percorsi da accompagnare`}><label className="toggle"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)}/>Mostra archiviati</label><button className="button primary" onClick={() => openDialog({ kind: 'child' })}><Plus size={17}/>Nuovo bambino</button></SectionHead>
      <div className="children-grid">{visibleChildren.map(c => { const t = totals(state, month, c.id); const agreement = state.agreements.find(a => a.childId === c.id && a.startsOn <= `${month}-31` && (!a.endsOn || a.endsOn >= `${month}-01`)); return <button className="child-card" onClick={() => openChild(c.id)} key={c.id}><div className="child-card-top"><Avatar child={c}/><ChevronRight size={18}/></div><h2>{childName(c)}</h2><p>{c.grade || 'Classe da aggiungere'}{!c.active && <span className="badge neutral">Archiviato</span>}</p><small className="school">{c.school || 'Scuola da aggiungere'}</small><div className="card-divider"/><span className="child-agreement">{agreement ? kindLabel[agreement.kind] : 'Accordo da aggiungere'}</span><div className="child-card-bottom"><span>Residuo del mese</span><strong>{euro(t.remaining)}</strong></div><div className="progress"><span style={{ width: `${t.expected ? t.received / t.expected * 100 : 0}%` }}/></div></button>; })}</div>
      {!visibleChildren.length && <Empty title="Un nuovo percorso ti aspetta">Aggiungi un bambino oppure cambia la ricerca.</Empty>}
    </>}

    {page === 'children' && child && <>
      <div className="detail-actions"><button className="text-button" onClick={() => setSelectedChild(null)}><ArrowLeft size={16}/>Tutti i bambini</button><div className="actions"><button className="button danger-outline" onClick={() => openDialog({ kind: 'manage', action: 'delete-child', id: child.id })}>Elimina bambino</button><button className="button secondary" onClick={() => openDialog({ kind: 'archive', child })}>{child.active ? 'Archivia' : 'Riattiva'}</button><button className="button primary" onClick={() => openDialog({ kind: 'child', child })}>Modifica scheda</button></div></div>
      <section className="child-banner"><Avatar child={child}/><div><h2>{childName(child)}</h2><p>{child.grade || 'Classe non specificata'} · {child.school || 'Scuola non specificata'}</p>{child.birthDate && <small>Nascita: {dateLabel(child.birthDate)}</small>}</div><span className={`badge ${child.active ? 'green' : 'neutral'}`}>{child.active ? 'Percorso attivo' : 'Archiviato'}</span></section>
      <Metrics state={state} month={month} childId={child.id}/>
      <div className="detail-grid"><section className="panel padded"><SectionHead title="La famiglia"/>{child.guardianIds.map(id => { const g = state.guardians.find(g => g.id === id)!; return <div className="contact" key={id}><div><strong>{g.name}</strong><span className="badge neutral">{g.relationship}{g.active === false ? ' · Archiviato' : ''}</span></div><p>{g.phone || 'Telefono da aggiungere'}</p><p>{g.email || 'Email da aggiungere'}</p><button className="text-button" onClick={() => openDialog({ kind: 'guardian', guardian: g })}>Modifica contatto</button></div>; })}{child.notes && <div className="notes"><span className="eyebrow">IL SUO PERCORSO</span><p>{child.notes}</p></div>}</section>
      <section className="panel padded"><SectionHead title="Accordi economici"><button className="text-button" disabled={!child.active} onClick={() => openDialog({ kind: 'agreement', childId: child.id })}><Plus size={15}/>Aggiungi</button></SectionHead>{state.agreements.filter(a => a.childId === child.id).sort((a, b) => b.startsOn.localeCompare(a.startsOn)).map(a => <div className="agreement" key={a.id}><div className="agreement-top"><span className={`badge ${a.endsOn ? 'neutral' : 'green'}`}>{kindLabel[a.kind]}</span><strong>{euro(a.amountCents)}</strong></div><h3>{a.label}</h3><p>Dal {dateLabel(a.startsOn)}{a.endsOn ? ` al ${dateLabel(a.endsOn)}` : ' · senza termine'}</p><div className="actions"><button className="text-button" aria-label={`Modifica accordo ${a.label}`} onClick={() => openDialog({ kind: 'manage', action: 'edit-agreement', id: a.id })}>Modifica</button><button className="text-button danger-text" aria-label={`Elimina accordo ${a.label}`} onClick={() => openDialog({ kind: 'manage', action: 'delete-agreement', id: a.id })}>Elimina</button>{!a.endsOn && <button className="text-button" onClick={() => openDialog({ kind: 'close', agreementId: a.id })}>Chiudi accordo</button>}{a.kind === 'custom' && child.active && <button className="text-button" onClick={() => openDialog({ kind: 'custom', agreementId: a.id })}><Plus size={14}/>Scadenza</button>}</div></div>)}{!state.agreements.some(a => a.childId === child.id) && <Empty title="Un accordo ancora da scrivere"/>}</section></div>
      <section className="panel"><SectionHead title="Le rette del mese"><button className="text-button" onClick={() => openDialog({ kind: 'issue' })}>Prepara rette<ArrowRight size={15}/></button></SectionHead><ChargeTable state={state} charges={monthCharges.filter(c => c.childId === child.id)} onPay={id => openDialog({ kind: 'payment', chargeId: id })} onEdit={id => openDialog({ kind: 'manage', action: 'edit-charge', id })} onDelete={id => openDialog({ kind: 'manage', action: 'delete-charge', id })}/></section>
    </>}

    {page === 'guardians' && <>
      <SectionHead title={`${visibleGuardians.length} persone di riferimento`}><label className="toggle"><input type="checkbox" checked={showArchivedGuardians} onChange={e => setShowArchivedGuardians(e.target.checked)}/>Mostra archiviati</label><button className="button primary" onClick={() => openDialog({ kind: 'guardian' })}><Plus size={17}/>Nuovo tutore</button></SectionHead><div className="guardian-grid">{visibleGuardians.map(g => <article className="panel guardian-card" key={g.id}><span className="guardian-symbol"><Users size={21}/></span><h2>{g.name}</h2><span className="badge neutral">{g.relationship}{g.active === false ? ' · Archiviato' : ''}</span><p>{g.phone || 'Telefono da aggiungere'}</p><p className="contact-email"><Mail size={14}/>{g.email || 'Email da aggiungere'}</p><div className="linked-children">{state.children.filter(c => c.guardianIds.includes(g.id)).map(c => <button key={c.id} className="text-button" onClick={() => openChild(c.id)}>{childName(c)}<ChevronRight size={13}/></button>)}</div>{g.notes && <p className="notes-small">{g.notes}</p>}<div className="guardian-actions"><button className="button secondary" onClick={() => openDialog({ kind: 'guardian', guardian: g })}>Modifica contatto</button><button className="text-button" aria-label={`${g.active === false ? 'Riattiva' : 'Archivia'} tutore ${g.name}`} onClick={() => openDialog({ kind: 'manage', action: 'guardian-status', id: g.id })}>{g.active === false ? 'Riattiva' : 'Archivia'}</button><button className="text-button danger-text" aria-label={`Elimina tutore ${g.name}`} onClick={() => openDialog({ kind: 'manage', action: 'delete-guardian', id: g.id })}>Elimina</button></div></article>)}</div>
    </>}

    {page === 'ledger' && <>
      <Metrics state={state} month={month}/><p className="metric-footnote">Rette con scadenza a {monthLabel(month)}. Incassi con data nel mese: <strong>{euro(cashInMonth)}</strong>. Il filtro “Scadute” comprende tutti i mesi.</p>
      <section className="panel"><SectionHead title="Rette e scadenze"><button className="button secondary" onClick={() => openDialog({ kind: 'custom' })}>Scadenza personalizzata</button><button className="button primary" onClick={() => openDialog({ kind: 'issue' })}><Plus size={16}/>Prepara rette</button></SectionHead><div className="filters"><label><span className="sr-only">Filtra per bambino</span><select aria-label="Filtra per bambino" value={ledgerChild} onChange={e => setLedgerChild(e.target.value)}><option value="">Tutti i bambini</option>{state.children.map(c => <option key={c.id} value={c.id}>{childName(c)}</option>)}</select></label><div className="segmented" aria-label="Stato scadenze">{[['all', 'Tutte'], ['open', 'Aperte'], ['paid', 'Saldate'], ['overdue', 'Scadute · tutti i mesi']].map(([key, label]) => <button key={key} className={ledgerStatus === key ? 'selected' : ''} aria-pressed={ledgerStatus === key} onClick={() => setLedgerStatus(key)}>{label}</button>)}</div></div>
      <ChargeTable state={state} charges={(ledgerStatus === 'overdue' ? overdue : monthCharges).filter(c => (!ledgerChild || c.childId === ledgerChild) && (ledgerStatus === 'open' ? balance(state, c).remaining > 0 : ledgerStatus === 'paid' ? balance(state, c).remaining === 0 : true))} onPay={id => openDialog({ kind: 'payment', chargeId: id })} onEdit={id => openDialog({ kind: 'manage', action: 'edit-charge', id })} onDelete={id => openDialog({ kind: 'manage', action: 'delete-charge', id })} onChild={openChild}/></section>
    </>}

    {page === 'history' && <>
      <SectionHead title="Ogni movimento, con la sua storia"><button className="button primary" onClick={() => openDialog({ kind: 'payment' })}><Plus size={16}/>Registra pagamento</button></SectionHead><section className="panel"><div className="panel-intro"><h2>Registro pagamenti</h2><p>Tutti i mesi · Gli storni restano visibili.</p></div>{!state.payments.length ? <Empty title="Il primo pagamento scriverà questa storia"/> : <div className="table-wrap"><table><thead><tr><th>Data</th><th>Bambino e causale</th><th>Metodo</th><th>Importo</th><th>Stato</th><th><span className="sr-only">Azioni</span></th></tr></thead><tbody>{[...state.payments].sort((a, b) => b.paidOn.localeCompare(a.paidOn) || b.createdAt.localeCompare(a.createdAt)).map(p => { const charge = state.charges.find(c => c.id === p.chargeId)!; const c = state.children.find(c => c.id === charge.childId)!; return <tr key={p.id} className={p.voidedAt ? 'voided' : ''}><td className="nowrap">{dateLabel(p.paidOn)}</td><td><strong>{childName(c)}</strong><small>{charge.label}</small>{p.note && <small>{p.note}</small>}{p.voidedAt && <small className="void-reason">Stornato il {timestampLabel(p.voidedAt)} · {p.voidReason}</small>}</td><td>{methodLabel[p.method]}</td><td className="money">{euro(p.amountCents)}</td><td><span className={`badge ${p.voidedAt ? 'orange' : 'green'}`}>{p.voidedAt ? 'Stornato' : 'Ricevuto'}</span></td><td><div className="row-actions">{!p.voidedAt && <><button className="icon-button" aria-label={`Modifica pagamento ${childName(c)} ${dateLabel(p.paidOn)}`} title="Modifica pagamento" onClick={() => openDialog({ kind: 'manage', action: 'edit-payment', id: p.id })}><Pencil size={16}/></button><button className="text-button" onClick={() => openDialog({ kind: 'void', paymentId: p.id })}>Storna</button></>}<button className="icon-button danger-text" aria-label={`Elimina pagamento ${childName(c)} ${dateLabel(p.paidOn)}`} title="Elimina pagamento" onClick={() => openDialog({ kind: 'manage', action: 'delete-payment', id: p.id })}><Trash2 size={16}/></button></div></td></tr>; })}</tbody></table></div>}</section>
      <section className="panel activity-panel"><SectionHead title="Diario delle operazioni"/><p className="muted">Ultime 50 operazioni. Il backup conserva lo storico completo.</p><ol className="activity">{state.audit.slice(-50).reverse().map(a => <li key={a.id}><span className="activity-dot"/><div><strong>{a.action}</strong><p>{a.detail}</p></div><time>{timestampLabel(a.at)}</time></li>)}</ol></section>
    </>}

    {page === 'archive' && <>
      <div className="archive-intro"><ShieldCheck size={28}/><div><h2>Un posto sicuro per le tue prove</h2><p>Questa versione usa un archivio locale dimostrativo. Non è collegata al cloud.</p></div><span className="badge green">V0.1.3 · Demo locale</span></div><div className="detail-grid"><section className="panel padded"><SectionHead title="Porta con te una copia"/><p className="body-copy">Il backup contiene schede, tutori, accordi, scadenze e pagamenti. Conservalo in una cartella che ritrovi facilmente.</p><button className="button primary" onClick={() => void doExport()}><Download size={17}/>Esporta backup</button><div className="archive-stats"><span><strong>{state.children.length}</strong>bambini</span><span><strong>{state.charges.length}</strong>scadenze</span><span><strong>{state.payments.length}</strong>movimenti</span></div><p className="muted">Ultimo salvataggio: {timestampLabel(state.updatedAt)}<br/>Revisione {state.revision} · schema 1</p></section><section className="panel padded"><SectionHead title="Ritrova un archivio"/><p className="body-copy">Seleziona un backup JSON di Memole's World. Prima di sostituire i dati potrai controllare il suo contenuto e confermare il ripristino.</p><input ref={importRef} type="file" accept=".json,application/json" aria-label="File backup da ripristinare" className="sr-only" onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }}/><button className="button secondary" onClick={() => importRef.current?.click()}><Upload size={17}/>Scegli un backup</button><p className="form-notice">Viene conservata anche la versione locale precedente. Esporta comunque una copia prima del ripristino.</p></section></div>
      <ArchiveManagement state={state} copies={safetyCopies} copiesError={safetyError} onManage={openDialog} onRestore={imported => openDialog({ kind: 'restore', imported })}/>
      <section className="panel padded help-panel"><CircleHelp size={22}/><div><h2>Il primo giro in Memole's World</h2><ol><li>Aggiungi un bambino e il suo tutore dalla sezione Bambini.</li><li>Apri la scheda e crea l’accordo economico.</li><li>Scegli il mese e prepara le rette. Per gli accordi personalizzati aggiungi le singole scadenze.</li><li>Registra acconti e saldi, poi controlla il residuo. In Storico puoi motivare uno storno.</li><li>Usa la matita per correggere e il cestino per eliminare. Da questa pagina puoi azzerare i dati e recuperare le copie di sicurezza.</li><li>Esporta un backup al termine delle prove.</li></ol><p className="muted">{isTauri() ? 'Archivio desktop: cartella dati dell’app, file memoles-world.json. Percorsi e recupero nella guida.' : 'Anteprima di sviluppo: archivio del browser separato da quello dell’app desktop.'} Usa solo dati dimostrativi in questa versione.</p></div></section>
    </>}
    <footer className="page-footer"><span>Fatto di cura, un giorno alla volta.</span><span>Memole's World</span></footer>
    </main></div>
    {notice && <div className="toast" role="status"><Check size={17}/>{notice}</div>}
    {dialog && (dialog.kind === 'manage' ? <ManagementDialog key={JSON.stringify(dialog)} spec={dialog} state={state} busy={busy} mutate={mutate} error={error} onClose={() => { setDialog(null); setError(''); }}/> : <ActionDialog key={JSON.stringify(dialog)} dialog={dialog} state={state} month={month} busy={busy} mutate={mutate} error={error} onClose={() => { setDialog(null); setError(''); }}/>)} 
  </div>;
}
