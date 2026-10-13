'use client';
import { useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Calendar, CheckCircle2, Clock, FileText, Plus, Save, Archive, History, Download, Search, RotateCcw, X, ChevronLeft, ChevronRight, BookOpen, ListChecks } from 'lucide-react';
import { downloadJSON } from '../lib/dashboard-config';
type Note = {
  id: string; week_start: string; task: string; responsible: string; due_date: string;
  status: string; notes: string; archived: boolean; revision: number; updated_at?: string;
};
const STATES = ['Pendiente', 'En curso', 'Completada', 'Bloqueada'];
const input = 'w-full bg-slate-900/70 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-subtek-cyan focus:ring-1 focus:ring-subtek-cyan';
function dateToday() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return `${parts.find(p=>p.type==='year')!.value}-${parts.find(p=>p.type==='month')!.value}-${parts.find(p=>p.type==='day')!.value}`;
}
function monday(date: string) {
  const d = new Date(date + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return d.toISOString().slice(0,10);
}
export default function WeeklyNotes({ supabase, responsibles }: { supabase: SupabaseClient; responsibles: string[] }) {
  const uid = 'shared-workspace'; // Namespace de borradores locales, no identidad ni credencial.
  const [week, setWeek] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState<Note | null>(null);
  const current = useRef<Note | null>(null);
  const account = useRef(uid);
  const request = useRef(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState('Organiza los compromisos de la semana.');
  const [filter, setFilter] = useState('');
  const [responsible, setResponsible] = useState('Todos');
  const [archived, setArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [followup, setFollowup] = useState('');
  const [followupAuthor, setFollowupAuthor] = useState('');
  const [history, setHistory] = useState<any[] | null>(null);
  const [conflict, setConflict] = useState<Note | null>(null);
  const cacheKey = (user: string) => {
    let tab = sessionStorage.getItem('subtek-tab-id');
    if (!tab) { tab = crypto.randomUUID(); sessionStorage.setItem('subtek-tab-id', tab); }
    return `subtek-weekly-draft:fzjovmnudqbwukyzsznc:${user}:${tab}`;
  };
  function change(next: Note | null) {
    if (account.current) {
      if (next) localStorage.setItem(cacheKey(account.current), JSON.stringify(next));
      else localStorage.removeItem(cacheKey(account.current));
    }
    current.current = next; setDraft(next);
  }
  async function reload() {
    const user = account.current;
    if (!user || !week) return;
    const ticket = ++request.current;
    try {
      const rows: Note[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error, count } = await supabase.from('subtek_weekly_notes').select('*', { count: 'exact' }).eq('week_start', week).order('id').range(offset, offset + 499);
        if (error) throw error;
        if (!data || count === null) throw new Error('Lectura incompleta.');
        rows.push(...data);
        if (rows.length >= count) break;
        if (!data.length) throw new Error('Lectura incompleta.');
      }
      if (ticket !== request.current || account.current !== user) return;
      setNotes(rows);
    } catch (e: any) { if (ticket === request.current) setMessage('No se pudo comprobar el weekly: ' + e.message); }
  }
  useEffect(() => { setWeek(monday(dateToday())); }, []);
  useEffect(() => {
    account.current = uid; request.current++;
    setNotes([]); setHistory(null); setConflict(null); current.current = null; setDraft(null);
    if (!uid) return;
    try {
      const raw = localStorage.getItem(cacheKey(uid));
      if (raw) { const restored = JSON.parse(raw); current.current = restored; setDraft(restored); }
    } catch (e: any) { setMessage('Borrador no recuperado: ' + e.message); }
  }, [uid]);
  useEffect(() => {
    if (!uid || !week) return;
    void reload();
    const timer = setInterval(() => { if (!document.hidden) void reload(); }, 30000);
    const refresh = () => { void reload(); };
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); request.current++; };
  }, [uid, week]);
  function backupDraft(extra?: unknown) {
    const value = { at: new Date().toISOString(), draft: current.current, extra };
    localStorage.setItem(`subtek-weekly-backup:${account.current ?? 'local'}:${crypto.randomUUID()}`, JSON.stringify(value));
    downloadJSON(value, 'subtek-weekly-borrador-respaldo.json');
  }
  function safeChange(next: Note | null) { try { change(next); } catch (e: any) { setMessage('No se conservó el borrador: ' + e.message); } }
  function newNote() {
    if (!uid || busy || current.current) return;
    setHistory(null); setConflict(null);
    safeChange({ id: crypto.randomUUID(), week_start: week, due_date: week, task: '', responsible: '', status: 'Pendiente', notes: 'ACUERDOS Y CONTEXTO\n\nPRÓXIMOS PASOS\n☐ \n\nSEGUIMIENTO\n', archived: false, revision: 0 });
  }
  async function save() {
    const d = current.current, user = account.current;
    if (!d || !user || lock.current) return;
    if (followup.trim()) { setMessage('Agrega el avance con fecha y hora antes de guardar la nota.'); return; }
    if (!d.task.trim() || !d.responsible.trim() || !d.due_date || monday(d.week_start) !== d.week_start) {
      setMessage('Completa tarea, responsable, fecha y semana (lunes).'); return;
    }
    lock.current = true; setBusy(true);
    try {
      const { data, error } = await supabase.rpc('subtek_save_weekly_note', {
        p_id: d.id, p_expected_revision: d.revision, p_week_start: d.week_start, p_task: d.task.trim(),
        p_responsible: d.responsible.trim(), p_due_date: d.due_date, p_status: d.status, p_notes: d.notes, p_archived: d.archived,
      });
      if (account.current !== user) return;
      if (error) {
        if (error.code === '40001') {
          const latest = await supabase.from('subtek_weekly_notes').select('*').eq('id', d.id).single();
          if (latest.error) throw latest.error;
          if (account.current !== user) return;
          setConflict(latest.data);
        }
        throw error;
      }
      if (!data?.revision) throw new Error('No se recibió confirmación del servidor.');
      change(null); setFollowup(''); setConflict(null); await reload(); setMessage('Compromiso guardado con historial de cambios.');
    } catch (e: any) { if (account.current === user) setMessage('No se confirmó el guardado; el borrador se conserva. ' + e.message); }
    finally { lock.current = false; setBusy(false); }
  }
  async function loadHistory(note: Note) {
    const user = account.current;
    try {
      const { data, error } = await supabase.from('subtek_weekly_history').select('*').eq('note_id', note.id).order('revision', { ascending: false });
      if (error) throw error;
      if (user === account.current) setHistory(data);
    } catch (e: any) { setMessage('No se pudo leer el historial: ' + e.message); }
  }
  const shown = notes.filter(n => (statusFilter === 'Todos' || n.status === statusFilter || (statusFilter === 'Vencidas' && n.due_date < dateToday() && n.status !== 'Completada')) && n.archived === archived && (responsible === 'Todos' || n.responsible === responsible) && `${n.task} ${n.notes} ${n.responsible}`.toLowerCase().includes(filter.toLowerCase()));
  const active = notes.filter(n => !n.archived);
  function shiftWeek(days: number) {
    const d = new Date(week + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+days); setWeek(d.toISOString().slice(0,10));
  }
  function addFollowup() {
    if (!draft || !followup.trim() || !followupAuthor.trim()) { setMessage('Escribe el avance y quién lo reporta.'); return; }
    const entry = `\n\n── ${new Date().toLocaleString('es-CO', {timeZone:'America/Bogota'})} · ${followupAuthor.trim()} ──\n${followup.trim()}`;
    if (draft.notes.length + entry.length > 20000) { setMessage('La nota está llena. Crea otra página para continuar.'); return; }
    safeChange({...draft, notes:draft.notes+entry}); setFollowup(''); setMessage('Avance agregado al borrador. Guarda la nota para compartirlo.');
  }
  const statusColor = (status: string) => status==='Completada' ? 'text-emerald-400' : status==='Bloqueada' ? 'text-red-400' : status==='En curso' ? 'text-subtek-cyan' : 'text-amber-400';
  return <section className="mb-12 rounded-2xl border border-subtek-cyan/30 bg-gradient-to-br from-subtek-card via-subtek-blue to-[#1a0f2e] overflow-hidden shadow-[0_0_25px_rgba(0,240,255,0.06)]" aria-label="Bitácora Weekly Subtek">
    <header className="p-6 md:p-8 border-b border-slate-700/70 flex flex-wrap justify-between gap-4 items-center">
      <div className="flex items-center gap-4"><div className="p-3 rounded-2xl bg-subtek-cyan/10 text-subtek-cyan"><BookOpen size={30}/></div><div><p className="text-xs tracking-[0.2em] text-subtek-cyan uppercase font-bold">Bloc de seguimiento</p><h2 className="text-3xl font-black">Weekly Subtek</h2><p className="text-sm text-slate-400 mt-1">Acuerdos, responsabilidades y memoria de cada semana.</p></div></div>
      <button onClick={newNote} disabled={!week || busy || !!draft} className="flex gap-2 items-center px-4 py-3 bg-subtek-cyan text-black font-bold rounded-xl disabled:opacity-40"><Plus size={18}/> Nueva nota</button>
    </header>
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex items-end gap-2"><button aria-label="Semana anterior" onClick={()=>shiftWeek(-7)} className="p-3 rounded-lg bg-slate-900"><ChevronLeft size={18}/></button><label className="text-xs text-slate-400">Semana del lunes<input aria-label="Semana del weekly" type="date" className={input+' mt-1'} value={week} onChange={e=>{if(e.target.value)setWeek(monday(e.target.value));}}/></label><button aria-label="Semana siguiente" onClick={()=>shiftWeek(7)} className="p-3 rounded-lg bg-slate-900"><ChevronRight size={18}/></button></div>
        <button onClick={()=>setWeek(monday(dateToday()))} className="text-xs text-subtek-cyan py-3">Esta semana</button>
        <div className="flex-1"/>
        <button onClick={()=>void reload()} className="flex gap-2 text-sm text-slate-400 p-2"><RotateCcw size={16}/> Actualizar</button>
        <button onClick={()=>downloadJSON({week,notes,draft},`subtek-weekly-${week}.json`)} className="flex gap-2 text-sm text-slate-300 p-2"><Download size={16}/> Exportar semana</button>
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="rounded-full bg-slate-900 px-3 py-2 text-slate-300">{active.length} notas</span><span className="rounded-full bg-cyan-950/50 px-3 py-2 text-subtek-cyan">{active.filter(n=>n.status!=='Completada').length} por resolver</span><span className="rounded-full bg-emerald-950/50 px-3 py-2 text-emerald-400">{active.filter(n=>n.status==='Completada').length} completadas</span><span className="rounded-full bg-red-950/40 px-3 py-2 text-red-400">{active.filter(n=>n.due_date<dateToday()&&n.status!=='Completada').length} vencidas</span>
      </div>
      <p role="status" className="text-xs text-slate-400">{message}</p>
      <div className="grid lg:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">
        <aside className="rounded-xl bg-slate-950/30 border border-slate-700 p-4 space-y-3">
          <h3 className="font-bold flex gap-2 items-center"><ListChecks size={18} className="text-subtek-cyan"/> Páginas de la semana</h3>
          <input aria-label="Buscar compromisos" className={input} placeholder="Buscar en el bloc…" value={filter} onChange={e=>setFilter(e.target.value)}/>
          <select aria-label="Filtrar por responsable" className={input} value={responsible} onChange={e=>setResponsible(e.target.value)}>{['Todos',...Array.from(new Set([...responsibles,...notes.map(n=>n.responsible)]))].map(r=><option key={r}>{r}</option>)}</select>
          <select aria-label="Filtrar por estado" className={input} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>{['Todos',...STATES,'Vencidas'].map(r=><option key={r}>{r}</option>)}</select>
          <label className="flex gap-2 text-xs text-slate-400 py-2"><input type="checkbox" checked={archived} onChange={e=>setArchived(e.target.checked)}/> Consultar notas archivadas</label>
          {draft && <p className="text-xs text-amber-300">Hay una página abierta. Guárdala o cierra el borrador para abrir otra.</p>}
          <div className="space-y-2 max-h-[650px] overflow-y-auto">
            {shown.length===0 && <p className="text-sm text-slate-500 py-6 text-center">No hay notas con estos filtros.</p>}
            {shown.sort((a,b)=>a.due_date.localeCompare(b.due_date)).map(n=><button key={n.id} disabled={busy || !!draft} onClick={()=>{setConflict(null);setHistory(null);safeChange(n);}} className="w-full text-left rounded-xl border border-slate-700 hover:border-subtek-cyan/50 bg-slate-900/60 p-4 space-y-2 disabled:opacity-60"><span className={'text-xs '+statusColor(n.status)}>{n.status}{n.due_date<dateToday()&&n.status!=='Completada'?' · Vencida':''}</span><h3 className="font-bold break-words">{n.task}</h3><p className="text-xs text-slate-400">{n.responsible} · {n.due_date}</p><p className="text-xs text-slate-500 line-clamp-2 whitespace-pre-wrap">{n.notes || 'Sin seguimiento todavía'}</p></button>)}
          </div>
        </aside>
        <div className="min-w-0">
          {!draft ? <div className="min-h-[520px] rounded-xl border border-slate-700 bg-slate-950/30 p-8 md:p-12 flex flex-col items-center justify-center text-center"><BookOpen size={48} className="text-subtek-cyan/60 mb-5"/><h3 className="text-xl font-bold">El espacio para dar seguimiento</h3><p className="text-slate-400 mt-3 max-w-md">Abre una página de la semana o crea una nota. Registra lo acordado, asigna un responsable y agrega los avances con fecha.</p><button onClick={newNote} className="text-subtek-cyan mt-6 flex items-center gap-2"><Plus size={18}/> Escribir una nueva nota</button><p className="text-xs text-slate-500 mt-8">Las notas guardadas se comparten entre dispositivos. Archivar conserva su contenido e historial.</p></div> : <article className="rounded-xl border border-subtek-cyan/40 bg-[#101b2b] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex flex-wrap justify-between gap-3"><span className="text-xs text-subtek-cyan uppercase tracking-widest">{draft.revision ? `Página · versión ${draft.revision}` : 'Nueva página'} · Borrador</span><button disabled={busy} onClick={()=>{backupDraft();safeChange(null);setFollowup('');setConflict(null);setHistory(null);}} className="text-xs text-slate-400 flex gap-1"><X size={14}/> Respaldar y cerrar</button></div>
            <fieldset disabled={busy} className="p-5 md:p-7 space-y-5">
              <label className="block text-xs text-slate-400">Título / tarea o acuerdo<input aria-label="Tarea o acuerdo" className={input+' mt-2 text-lg font-bold'} maxLength={300} placeholder="¿Qué acordamos esta semana?" value={draft.task} onChange={e=>safeChange({...draft,task:e.target.value})}/></label>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-xs text-slate-400">Responsable<input aria-label="Responsable del compromiso" list="weekly-responsibles" className={input+' mt-1'} maxLength={150} placeholder="Quién lidera este acuerdo" value={draft.responsible} onChange={e=>safeChange({...draft,responsible:e.target.value})}/><datalist id="weekly-responsibles">{responsibles.map(r=><option key={r} value={r}/>)}</datalist></label>
                <label className="text-xs text-slate-400">Estado<select aria-label="Estado del compromiso" className={input+' mt-1'} value={draft.status} onChange={e=>safeChange({...draft,status:e.target.value})}>{STATES.map(s=><option key={s}>{s}</option>)}</select></label>
                <label className="text-xs text-slate-400">Semana del acuerdo<input aria-label="Semana de la nota" type="date" className={input+' mt-1'} value={draft.week_start} onChange={e=>{if(e.target.value)safeChange({...draft,week_start:monday(e.target.value)});}}/></label>
                <label className="text-xs text-slate-400">Fecha compromiso<input aria-label="Fecha del compromiso" type="date" className={input+' mt-1'} value={draft.due_date} onChange={e=>safeChange({...draft,due_date:e.target.value})}/></label>
              </div>
              <div><div className="flex flex-wrap justify-between gap-2 mb-2"><label htmlFor="weekly-notebook" className="text-xs text-slate-400">Acuerdos, próximos pasos y seguimiento</label><button type="button" onClick={()=>{if(draft.notes.length+4<=20000)safeChange({...draft,notes:draft.notes+'\n☐ '});}} className="text-xs text-subtek-cyan">+ Paso pendiente</button></div><textarea id="weekly-notebook" aria-label="Notas y seguimiento" className="w-full min-h-[360px] resize-y rounded-lg border border-slate-700 pl-6 pr-4 py-3 text-sm leading-8 text-slate-200 outline-none focus:border-subtek-cyan" style={{backgroundColor:'#0e1726',backgroundImage:'repeating-linear-gradient(transparent,transparent 31px,rgba(100,116,139,.15) 31px,rgba(100,116,139,.15) 32px)',backgroundPosition:'0 12px'}} maxLength={20000} placeholder="Escribe aquí el contexto, decisiones y próximos pasos…" value={draft.notes} onChange={e=>safeChange({...draft,notes:e.target.value})}/><p className="text-right text-xs text-slate-500 mt-1">{draft.notes.length.toLocaleString('es-CO')} / 20.000 caracteres</p></div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/30 p-4 space-y-3"><h4 className="font-bold text-sm flex gap-2"><Clock size={16} className="text-subtek-cyan"/> Registrar un avance</h4><input aria-label="Quién reporta el avance" className={input} maxLength={150} placeholder="Quién reporta este avance" value={followupAuthor} onChange={e=>setFollowupAuthor(e.target.value)}/><textarea aria-label="Nuevo avance" className={input+' min-h-24'} maxLength={2000} placeholder="Qué cambió, evidencia, bloqueo o siguiente paso…" value={followup} onChange={e=>setFollowup(e.target.value)}/><button type="button" onClick={addFollowup} className="text-subtek-cyan text-sm flex gap-2 items-center"><Plus size={16}/> Agregar con fecha y hora</button></div>
              <div className="flex flex-wrap gap-4 items-center"><button onClick={()=>void save()} disabled={!!conflict} className="bg-subtek-cyan text-black px-5 py-3 rounded-lg font-bold flex gap-2 items-center disabled:opacity-40"><Save size={17}/>{busy?'Guardando…':'Guardar nota'}</button><label className="text-xs text-slate-400"><input type="checkbox" checked={draft.archived} onChange={e=>safeChange({...draft,archived:e.target.checked})}/> Archivar sin borrar</label>{draft.revision>0&&<button type="button" onClick={()=>void loadHistory(draft)} className="text-xs text-slate-400 flex gap-1"><History size={16}/> Ver historial</button>}</div><p className="text-xs text-slate-500">Borrador protegido en este navegador. Cada guardado en Supabase conserva una versión.</p>
            </fieldset>
            {conflict && <div className="m-5 p-4 border border-amber-500/40 rounded-xl space-y-3"><p className="text-amber-300 text-sm">Otra persona actualizó esta nota. Tu borrador está protegido; revisa la versión compartida antes de continuar.</p><details className="text-sm"><summary>Ver versión compartida · {conflict.responsible}</summary><h4 className="font-bold mt-3">{conflict.task}</h4><p>{conflict.status} · {conflict.due_date}</p><p className="whitespace-pre-wrap mt-3">{conflict.notes}</p></details><button onClick={()=>{backupDraft(conflict);safeChange(conflict);setConflict(null);}} className="text-subtek-cyan text-sm">Respaldar mi borrador y abrir la versión compartida</button></div>}
          </article>}
          {history && <div className="mt-5 border border-slate-700 rounded-xl p-5 space-y-3 bg-slate-950/30"><div className="flex justify-between"><h3 className="font-bold flex gap-2"><History size={18}/> Memoria de la nota</h3><button aria-label="Cerrar historial" onClick={()=>setHistory(null)}><X size={16}/></button></div>{history.length===0&&<p className="text-sm text-slate-400">Todavía no hay versiones para mostrar.</p>}{history.map(h=><details key={h.revision} className="bg-slate-900/70 rounded-lg p-4 text-sm"><summary className="cursor-pointer text-subtek-cyan">Versión {h.revision} · {new Date(h.saved_at).toLocaleString('es-CO',{timeZone:'America/Bogota'})}</summary><h4 className="font-bold mt-4">{h.snapshot.task}</h4><p className="text-xs text-slate-400 mt-2">{h.snapshot.responsible} · {h.snapshot.status} · Compromiso: {h.snapshot.due_date}{h.snapshot.archived?' · Archivada':''}</p><p className="mt-4 whitespace-pre-wrap break-words text-slate-300">{h.snapshot.notes || 'Sin notas.'}</p></details>)}</div>}
        </div>
      </div>
    </div>
  </section>;
}
