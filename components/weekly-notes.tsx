'use client';
import { useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Calendar, CheckCircle2, Clock, FileText, Plus, Save, Archive, History, Download, Search, RotateCcw, X } from 'lucide-react';
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
      setNotes(rows); setMessage('Compromisos actualizados. Los borradores se guardan al pulsar Guardar.');
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
    safeChange({ id: crypto.randomUUID(), week_start: week, due_date: week, task: '', responsible: '', status: 'Pendiente', notes: '', archived: false, revision: 0 });
  }
  async function save() {
    const d = current.current, user = account.current;
    if (!d || !user || lock.current) return;
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
      change(null); setConflict(null); await reload(); setMessage('Compromiso guardado con historial de cambios.');
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
  const shown = notes.filter(n => n.archived === archived && (responsible === 'Todos' || n.responsible === responsible) && `${n.task} ${n.notes} ${n.responsible}`.toLowerCase().includes(filter.toLowerCase()));
  const active = notes.filter(n => !n.archived);
  return <section className="mt-10 mb-12 rounded-2xl border border-subtek-cyan/30 bg-gradient-to-br from-subtek-card via-subtek-blue to-[#1a0f2e] overflow-hidden shadow-[0_0_25px_rgba(0,240,255,0.06)]" aria-label="Bitácora Weekly Subtek">
    <div className="p-6 border-b border-slate-700/70 flex flex-wrap justify-between gap-4 items-center">
      <div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-subtek-cyan/10 text-subtek-cyan"><FileText size={26}/></div><div><p className="text-xs tracking-[0.2em] text-subtek-cyan uppercase font-bold">Compromisos del equipo</p><h2 className="text-2xl font-black">Weekly Subtek</h2><p className="text-sm text-slate-400 mt-1">Una semana. Responsables claros. Seguimiento visible.</p></div></div>
      <button onClick={newNote} disabled={!uid || busy || !!draft} className="flex gap-2 items-center px-4 py-2.5 bg-subtek-cyan text-black font-bold rounded-lg disabled:opacity-40 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]"><Plus size={18}/> Nuevo compromiso</button>
    </div>
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[{ label:'Compromisos', value:active.length, icon:FileText, color:'text-subtek-cyan' },{ label:'En seguimiento',value:active.filter(n=>n.status!=='Completada').length, icon:Clock,color:'text-amber-400' },{ label:'Completados',value:active.filter(n=>n.status==='Completada').length,icon:CheckCircle2,color:'text-emerald-400' }].map(s=><div key={s.label} className="rounded-xl border border-slate-700 bg-slate-950/30 p-4 flex gap-3 items-center"><s.icon className={s.color} size={22}/><div><p className="text-2xl font-black">{s.value}</p><p className="text-xs text-slate-400">{s.label}</p></div></div>)}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-400 flex-1 min-w-40">Semana del lunes<input aria-label="Semana del weekly" type="date" className={input+' mt-1'} value={week} onChange={e=>{if(e.target.value)setWeek(monday(e.target.value));}} /></label>
        <label className="text-xs text-slate-400 flex-1 min-w-40">Responsable<select className={input+' mt-1'} value={responsible} onChange={e=>setResponsible(e.target.value)}>{['Todos',...Array.from(new Set([...responsibles,...notes.map(n=>n.responsible)]))].map(r=><option key={r}>{r}</option>)}</select></label>
        <label className="text-xs text-slate-400 flex-[2] min-w-48">Buscar<input aria-label="Buscar compromisos" className={input+' mt-1'} placeholder="Tarea, notas o responsable…" value={filter} onChange={e=>setFilter(e.target.value)}/></label>
        <button className="text-sm text-subtek-cyan p-2" onClick={()=>void reload()}><RotateCcw size={18}/><span className="sr-only">Actualizar</span></button>
        <button className="text-sm text-slate-300 p-2 flex gap-1" onClick={()=>downloadJSON({ week, notes, draft },`subtek-weekly-${week}.json`)}><Download size={16}/> Exportar</button>
      </div>
      <div className="flex justify-between gap-2 text-xs text-slate-400"><p role="status">{message}</p><label className="whitespace-nowrap"><input type="checkbox" checked={archived} onChange={e=>setArchived(e.target.checked)}/> Ver archivados</label></div>
      {draft && <div className="rounded-xl border border-subtek-cyan/50 bg-slate-950/40 p-5 space-y-4">
        <div className="flex justify-between items-center"><h3 className="font-bold text-subtek-cyan">{draft.revision ? 'Editar compromiso' : 'Nuevo compromiso'} · Borrador local</h3><button disabled={busy} onClick={()=>{backupDraft(); safeChange(null); setConflict(null);}} className="text-xs text-slate-400 flex gap-1"><X size={16}/> Exportar y cerrar</button></div>
        <fieldset disabled={busy} className="space-y-4">
          <label className="block text-xs text-slate-400">Tarea o acuerdo<input aria-label="Tarea o acuerdo" className={input+' mt-1'} maxLength={300} placeholder="Ej: validar dataset del piloto CCTV" value={draft.task} onChange={e=>safeChange({...draft,task:e.target.value})}/></label>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="text-xs text-slate-400">Responsable<input aria-label="Responsable del compromiso" list="weekly-responsibles" className={input+' mt-1'} maxLength={150} value={draft.responsible} onChange={e=>safeChange({...draft,responsible:e.target.value})}/><datalist id="weekly-responsibles">{responsibles.map(r=><option key={r} value={r}/>)}</datalist></label>
            <label className="text-xs text-slate-400">Semana (lunes)<input type="date" className={input+' mt-1'} value={draft.week_start} onChange={e=>{if(e.target.value)safeChange({...draft,week_start:monday(e.target.value)});}}/></label>
            <label className="text-xs text-slate-400">Fecha compromiso<input aria-label="Fecha del compromiso" type="date" className={input+' mt-1'} value={draft.due_date} onChange={e=>safeChange({...draft,due_date:e.target.value})}/></label>
            <label className="text-xs text-slate-400">Estado<select aria-label="Estado del compromiso" className={input+' mt-1'} value={draft.status} onChange={e=>safeChange({...draft,status:e.target.value})}>{STATES.map(s=><option key={s}>{s}</option>)}</select></label>
          </div>
          <label className="block text-xs text-slate-400">Notas y seguimiento<textarea aria-label="Notas y seguimiento" className={input+' mt-1 min-h-28 resize-y'} maxLength={20000} placeholder="Acuerdos, avances, bloqueos y próximos pasos…" value={draft.notes} onChange={e=>safeChange({...draft,notes:e.target.value})}/></label>
          <div className="flex flex-wrap gap-4 items-center"><button onClick={()=>void save()} disabled={!!conflict} className="bg-subtek-cyan text-black px-4 py-2 rounded-lg font-bold flex gap-2 items-center disabled:opacity-40"><Save size={17}/>{busy?'Guardando…':'Guardar compromiso'}</button><label className="text-xs text-slate-400"><input type="checkbox" checked={draft.archived} onChange={e=>safeChange({...draft,archived:e.target.checked})}/> Archivar sin borrar</label><span className="text-xs text-slate-500">Cada guardado conserva una versión.</span></div>
        </fieldset>
        {conflict && <div className="p-3 border border-amber-500/40 rounded text-sm space-y-2"><p className="text-amber-400">La nota cambió en otro dispositivo. El borrador se conserva.</p><pre className="text-xs overflow-auto">{JSON.stringify({ borrador:draft, servidor:conflict },null,2)}</pre><button onClick={()=>{backupDraft(conflict);safeChange(conflict);setConflict(null);}} className="text-subtek-cyan">Exportar y abrir la versión del servidor para conciliar</button></div>}
      </div>}
      {shown.length===0 ? <div className="p-10 border border-dashed border-slate-700 rounded-xl text-center text-slate-500"><Calendar className="mx-auto mb-3 text-slate-600" size={30}/><p>{'No hay compromisos con estos filtros.'}</p></div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{shown.map(n=>{
        const color = n.status==='Completada'?'text-emerald-400 bg-emerald-950/40 border-emerald-500/30':n.status==='Bloqueada'?'text-red-400 bg-red-950/40 border-red-500/30':n.status==='En curso'?'text-subtek-cyan bg-cyan-950/40 border-cyan-500/30':'text-amber-400 bg-amber-950/40 border-amber-500/30';
        return <article key={n.id} className="rounded-xl border border-slate-700 bg-slate-950/30 p-5 flex flex-col gap-3 hover:border-subtek-cyan/40 transition-colors"><div className="flex justify-between gap-2"><span className={'text-xs px-2 py-1 rounded-full border '+color}>{n.status}</span><span className="text-xs text-slate-500">v{n.revision}</span></div><h3 className="font-bold text-lg break-words">{n.task}</h3><p className="text-sm text-subtek-cyan">{n.responsible}</p><p className="flex gap-2 text-xs text-slate-400"><Calendar size={14}/>{n.due_date}{n.due_date<dateToday()&&n.status!=='Completada'&&<span className="text-red-400">Vencida</span>}</p><p className="text-sm whitespace-pre-wrap break-words text-slate-300 line-clamp-4 flex-1">{n.notes||'Sin notas de seguimiento.'}</p><div className="flex justify-between border-t border-slate-800 pt-3"><button className="text-sm text-subtek-cyan disabled:opacity-40" disabled={busy||!!draft} onClick={()=>{setConflict(null);setHistory(null);safeChange(n);}}>Abrir / editar</button><button className="text-xs text-slate-400 flex gap-1" onClick={()=>void loadHistory(n)}><History size={14}/> Historial</button></div></article>;
      })}</div>}
      {history && <div className="border border-slate-700 rounded-xl p-4 space-y-3"><div className="flex justify-between"><h3 className="font-bold">Historial de cambios</h3><button onClick={()=>setHistory(null)}><X size={16}/><span className="sr-only">Cerrar historial</span></button></div>{history.map(h=><details key={h.revision} className="bg-slate-950/40 rounded p-3 text-sm"><summary>Versión {h.revision} · {new Date(h.saved_at).toLocaleString('es-CO',{timeZone:'America/Bogota'})}</summary><p className="text-xs text-slate-500 mt-2">Usuario: {h.saved_by}</p><pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">{JSON.stringify(h.snapshot,null,2)}</pre></details>)}</div>}
    </div>
  </section>;
}
