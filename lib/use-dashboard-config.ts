'use client';
import { useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BACKUP_KEY, Config, CloudConfig, DEFAULT_ROADMAP, downloadJSON, equalConfig, legacyConfig, snapshotLegacy, validateConfig } from './dashboard-config';
type State = {
  draft: Config; base: CloudConfig | null; remote: CloudConfig | null;
  ready: boolean; dirty: boolean; review: boolean; conflict: boolean;
};
const defaults: Config = { roadmap: { ...DEFAULT_ROADMAP }, total: 0, mes: 'Septiembre', anio: 2026 };
const initial: State = { draft: defaults, base: null, remote: null, ready: false, dirty: false, review: true, conflict: false };
export function useDashboardConfig(supabase: SupabaseClient) {
  const [state, setState] = useState<State>(initial);
  const current = useRef(state);
  const [uid, setUid] = useState<string | null>(null);
  const user = useRef<string | null>(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('Configuración compartida pendiente de comprobar.');
  const [legacyTotal, setLegacyTotal] = useState<number | null>(null);
  const key = (id: string) => {
    let tab = sessionStorage.getItem('subtek-tab-id');
    if (!tab) { tab = crypto.randomUUID(); sessionStorage.setItem('subtek-tab-id', tab); }
    return `subtek-config-v7:fzjovmnudqbwukyzsznc:${id}:1:${tab}`;
  };
  const update = (next: State, persist = true) => {
    // Persistir antes de aceptar una edición: si hay cuota agotada, conservar el borrador anterior.
    if (persist && user.current) localStorage.setItem(key(user.current), JSON.stringify(next));
    current.current = next; setState(next);
  };
  const decodeCloud = (row: any): CloudConfig => {
    if (!row || row.id !== 1 || !Number.isInteger(row.revision) || row.revision < 1) throw new Error('Respuesta de configuración inválida.');
    return { ...validateConfig(row), id: 1, revision: row.revision, updated_at: row.updated_at };
  };
  async function load(restore = false) {
    const id = user.current;
    if (!id || busy.current) return;
    const ticket = generation.current;
    busy.current = true; setWorking(true);
    try {
      let local = current.current;
      let canUseLegacyTotal = false;
      if (restore) {
        const raw = snapshotLegacy(localStorage);
        local = { ...initial, draft: legacyConfig(raw) };
        const cached = localStorage.getItem(key(id));
        canUseLegacyTotal = !cached && raw['subtek-ppto-v6'] === null;
        if (cached) {
          const c = JSON.parse(cached) as State;
          local = { ...local, draft: validateConfig(c.draft), base: c.base ? decodeCloud(c.base) : null,
            dirty: !!c.dirty, review: !!c.review };
        }
      }
      const { data: member, error: memberError } = await supabase.from('subtek_config_members').select('user_id').eq('user_id', id).maybeSingle();
      if (memberError) throw memberError;
      if (!member) throw new Error('La cuenta no tiene permiso para esta configuración.');
      const { data, error } = await supabase.from('subtek_dashboard_config').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      if (ticket !== generation.current) return;
      const remote = data ? decodeCloud(data) : null;
      if (!remote) {
        if (local.base) throw new Error('La fila compartida desapareció. No reinicializar automáticamente.');
        update({ ...local, ready: true, remote: null, review: true, conflict: false });
        setMessage('No hay configuración compartida. Revisar todos los dispositivos y el total anterior antes de inicializar.');
      } else if (equalConfig(local.draft, remote)) {
        update({ draft: validateConfig(remote), base: remote, remote, ready: true, dirty: false, review: false, conflict: false });
        setMessage('Configuración comprobada en servidor.');
      } else if (local.dirty || local.review) {
        // Conservar el borrador y su revisión de origen; jamás sustituirlos por la última revisión.
        const conflict = !local.base || local.base.revision !== remote.revision;
        update({ ...local, remote, ready: true, conflict, review: local.review || conflict });
        setMessage('Hay diferencias. Exportar y revisar antes de adoptar la nube o conciliar el borrador.');
      } else {
        update({ draft: validateConfig(remote), base: remote, remote, ready: true, dirty: false, review: false, conflict: false });
        setMessage('Configuración actualizada desde el servidor.');
      }
      // Solo lectura: este total puede diferir; nunca lo mezclar automáticamente con mes/año locales.
      const old = await supabase.from('presupuesto_global').select('total').eq('id', 1).maybeSingle();
      if (ticket !== generation.current) return;
      if (old.error) setMessage(m => m + ' No se pudo verificar el presupuesto anterior: ' + old.error!.message);
      else {
        setLegacyTotal(old.data ? Number(old.data.total) : null);
        if (canUseLegacyTotal && !remote && old.data && Number.isFinite(Number(old.data.total)) && Number(old.data.total) >= 0) {
          update({ ...current.current, draft: { ...current.current.draft, total: Number(old.data.total) } });
        }
      }
    } catch (e: any) {
      if (ticket !== generation.current) return;
      current.current = { ...current.current, ready: false }; setState(current.current);
      setMessage('No se verificó la nube: ' + e.message);
    } finally {
      busy.current = false; setWorking(false);
    }
  }
  useEffect(() => {
    let active = true;
    try { snapshotLegacy(localStorage); } catch (e: any) { setMessage('No se pudo crear respaldo local: ' + e.message); return; }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUid(session?.user.id ?? null);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage(error.message); else setUid(data.session?.user.id ?? null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [supabase]);
  useEffect(() => {
    generation.current++; user.current = uid;
    current.current = initial; setState(initial); setLegacyTotal(null);
    if (uid) {
      // Una petición anterior puede estar acabando; no solapar ni reutilizar su estado.
      const timer = setInterval(() => { if (!busy.current) { clearInterval(timer); void load(true); } }, 50);
      return () => clearInterval(timer);
    }
    setMessage('Iniciar sesión con una cuenta autorizada para comprobar la configuración compartida.');
  }, [uid]);
  useEffect(() => {
    const refresh = () => { if (!document.hidden) void load(); };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  function edit(partial: Partial<Config>) {
    if (busy.current || !current.current.ready) return;
    try { update({ ...current.current, draft: { ...current.current.draft, ...partial }, dirty: true }); }
    catch (e: any) { setMessage('No se conservó la edición: ' + e.message); }
  }
  function exportBackup() {
    // Copia durable antes de cualquier adopción: no depender de que el navegador complete una descarga.
    localStorage.setItem(`subtek-config-v7-backup:${user.current ?? 'local'}:${crypto.randomUUID()}`,
      JSON.stringify({ at: new Date().toISOString(), state: current.current, legacyTotal }));
    downloadJSON({ original: JSON.parse(localStorage.getItem(BACKUP_KEY) ?? 'null'),
      currentLegacy: snapshotLegacy(localStorage), config: current.current, legacyTotal,
      preservedDrafts: Object.fromEntries(Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter(k => k.startsWith('subtek-config-v7:') || k.startsWith('subtek-config-v7-backup:') || k.startsWith('subtek-weekly-draft:') || k.startsWith('subtek-weekly-backup:')).map(k => [k, localStorage.getItem(k)])) }, 'subtek-respaldo-transicion.json');
  }
  function adoptCloud() {
    if (busy.current || !current.current.ready || !current.current.remote) return;
    try {
      exportBackup(); const remote = current.current.remote;
      update({ draft: validateConfig(remote), base: remote, remote, ready: true, dirty: false, review: false, conflict: false });
      setMessage('Se adoptó la nube; el borrador anterior quedó exportado.');
    } catch (e: any) { setMessage(e.message); }
  }
  function acceptReviewedDraft() {
    if (busy.current || !current.current.ready) return;
    try {
      exportBackup(); validateConfig(current.current.draft);
      update({ ...current.current, base: current.current.remote, review: false, conflict: false, dirty: true });
      setMessage('Borrador conciliado. Guardar usará la revisión que acabas de revisar.');
    } catch (e: any) { setMessage(e.message); }
  }
  async function save() {
    const s = current.current;
    if (busy.current || !user.current || !s.ready || s.review || s.conflict) throw new Error('Comprobar y conciliar la configuración antes de guardar.');
    if (!s.dirty) return;
    const draft = validateConfig(s.draft), ticket = generation.current;
    busy.current = true; setWorking(true);
    try {
      exportBackup();
      const { data, error } = await supabase.rpc('subtek_save_dashboard_config', {
        p_expected_revision: s.base?.revision ?? 0, p_roadmap: draft.roadmap, p_total: draft.total, p_mes: draft.mes, p_anio: draft.anio,
      });
      if (ticket !== generation.current) throw new Error('La sesión cambió durante el guardado. Volver a comprobar.');
      if (error) {
        if (error.code === '40001') update({ ...s, conflict: true, review: true, ready: false });
        throw error;
      }
      const remote = decodeCloud(data);
      update({ draft: validateConfig(remote), base: remote, remote, ready: true, dirty: false, review: false, conflict: false });
      setMessage('Roadmap y presupuesto confirmados en servidor.');
    } catch (e: any) { setMessage('No se confirmó el guardado: ' + e.message); throw e; }
    finally { busy.current = false; setWorking(false); }
  }
  return { ...state, uid, working, message, legacyTotal, edit, load: () => load(), save, exportBackup, adoptCloud, acceptReviewedDraft };
}
