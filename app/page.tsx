"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Download, Plus, Trash2, Users, Link as LinkIcon,
  AlertTriangle, TrendingUp, Info, BarChart3, CheckSquare, X, Calendar
} from 'lucide-react';

// ==========================================
// 🚀 CONEXIÓN A LA NUBE DE SUBTEK
const SUPABASE_URL = 'https://fzjovmnudqbwukyzsznc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rxf7CQsMHtXx-Ndo1RpE5A_52kMOtb3'; 
// ==========================================

const hasSupabase = SUPABASE_URL.startsWith('http');
const supabase = hasSupabase ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

type Gerencia = 'Dashboard Global' | 'Gerencia General' | 'Gerencia de Producto' | 'Gerencia Comercial' | 'Gerencia de Procesos y Proyectos';
type Estatus = 'Sin iniciar' | 'En curso' | 'Finalizado';
type Veredicto = 'Pendiente' | 'Validada' | 'Refutada';

interface Subtarea { id: string; texto: string; completada: boolean; }

interface Hipotesis {
  id: string; gerencia: Gerencia; nombre: string; responsable: string;
  presupuestoAsignado: number; presupuestoGastado: number; fechaInicio: string; fechaLimite: string;
  avance: number; estatus: Estatus; veredicto: Veredicto; observaciones: string; evidencia: string; subtareas: Subtarea[];
}

const GERENCIAS: Gerencia[] = ['Dashboard Global', 'Gerencia General', 'Gerencia de Producto', 'Gerencia Comercial', 'Gerencia de Procesos y Proyectos'];
const RESPONSABLES = ['Nixon Castiblanco', 'Edwin Escalante', 'Daniel Arevalo', 'Lis Gordillo'];

export default function SubtekDashboard() {
  const [hipotesis, setHipotesis] = useState<Hipotesis[]>([]);
  const [presupuestoTotalSubtek, setPresupuestoTotalSubtek] = useState<number>(0);
  const [gerenciaActiva, setGerenciaActiva] = useState<Gerencia>('Dashboard Global');
  const [isClient, setIsClient] = useState(false);
  const [modalBorrar, setModalBorrar] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>('Conectando...');

  // 1. CARGA INICIAL HÍBRIDA (Offline-First para Subtek)
  useEffect(() => {
    setIsClient(true);
    
    // Primero, recupera lo local inmediatamente (A prueba de F5)
    try {
      const saved = localStorage.getItem('subtek-hipotesis-v4');
      if (saved) setHipotesis(JSON.parse(saved));
      const savedPpto = localStorage.getItem('subtek-presupuesto-v4');
      if (savedPpto) setPresupuestoTotalSubtek(Number(savedPpto));
    } catch (error) { console.error("Error local:", error); }

    // Segundo, intenta traer de la nube de forma asíncrona
    cargarDatosNube();
  }, []);

  // 2. GUARDADO AUTOMÁTICO EN TIEMPO REAL (Respaldo Local Fuerte)
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('subtek-hipotesis-v4', JSON.stringify(hipotesis));
      localStorage.setItem('subtek-presupuesto-v4', presupuestoTotalSubtek.toString());
    }
  }, [hipotesis, presupuestoTotalSubtek, isClient]);

  const cargarDatosNube = async () => {
    if (!supabase) return;
    try {
      const { data: hipData, error } = await supabase.from('hipotesis').select('*');
      if (error) throw error;
      if (hipData && hipData.length > 0) {
        setHipotesis(hipData as Hipotesis[]);
      }
      
      const { data: pptoData } = await supabase.from('presupuesto_global').select('total').eq('id', 1).single();
      if (pptoData) setPresupuestoTotalSubtek(pptoData.total);
      setSyncStatus('ONLINE - NUBE SINCRONIZADA');
    } catch (error) { 
      console.error("Error nube:", error); 
      setSyncStatus('MODO OFFLINE (Guardado Local Activo)');
    }
  };

  // 3. FUNCIONES DE GUARDADO (Doble vía: Local y Cloud)
  const guardarPresupuestoTotal = async (valor: number) => {
    setPresupuestoTotalSubtek(valor);
    if (supabase) {
      try { await supabase.from('presupuesto_global').upsert({ id: 1, total: valor }); } catch (e) {}
    }
  };

  const agregarHipotesis = async () => {
    const nueva: Hipotesis = {
      id: Math.random().toString(36).substr(2, 9),
      gerencia: gerenciaActiva === 'Dashboard Global' ? 'Gerencia General' : gerenciaActiva,
      nombre: '', responsable: '', presupuestoAsignado: 0, presupuestoGastado: 0,
      fechaInicio: new Date().toISOString().split('T')[0], fechaLimite: '',
      avance: 0, estatus: 'Sin iniciar', veredicto: 'Pendiente', observaciones: '', evidencia: '', subtareas: []
    };
    setHipotesis([nueva, ...hipotesis]);
    if (gerenciaActiva === 'Dashboard Global') setGerenciaActiva('Gerencia General');
    if (supabase) {
      try { await supabase.from('hipotesis').insert(nueva); } catch (e) {}
    }
  };

  const syncHipotesis = async (newState: Hipotesis[], id: string) => {
    setHipotesis(newState);
    if (supabase) {
      try {
        const target = newState.find(h => h.id === id);
        if (target) await supabase.from('hipotesis').upsert(target);
      } catch (e) {}
    }
  };

  const actualizarHipotesis = (id: string, campo: keyof Hipotesis, valor: string | number) => {
    const newState = hipotesis.map(h => h.id === id ? { ...h, [campo]: valor } : h);
    syncHipotesis(newState, id);
  };

  const agregarSubtarea = (id: string, txt: string) => {
    if (!txt.trim()) return;
    const newState = hipotesis.map(h => h.id === id ? { ...h, subtareas: [...(h.subtareas || []), { id: Math.random().toString(36).substr(2, 5), texto: txt, completada: false }] } : h);
    syncHipotesis(newState, id);
  };

  const toggleSubtarea = (idHip: string, idSub: string) => {
    const newState = hipotesis.map(h => h.id === idHip ? { ...h, subtareas: h.subtareas.map(s => s.id === idSub ? { ...s, completada: !s.completada } : s) } : h);
    syncHipotesis(newState, idHip);
  };

  const borrarSubtarea = (idHip: string, idSub: string) => {
    const newState = hipotesis.map(h => h.id === idHip ? { ...h, subtareas: h.subtareas.filter(s => s.id !== idSub) } : h);
    syncHipotesis(newState, idHip);
  };

  const confirmarBorrado = async () => {
    if (modalBorrar) {
      setHipotesis(prev => prev.filter(h => h.id !== modalBorrar));
      if (supabase) {
        try { await supabase.from('hipotesis').delete().eq('id', modalBorrar); } catch (e) {}
      }
      setModalBorrar(null);
    }
  };

  const exportarCSV = () => {
    const headers = ['ID', 'Gerencia', 'Nombre_Proyecto', 'Responsable', 'Fecha_Inicio', 'Fecha_Limite', 'P_Asignado', 'P_Gastado', 'Avance_Porcentaje', 'Estatus', 'Veredicto', 'Evidencia_URL', 'Observaciones', 'Subtarea_Texto', 'Subtarea_Estado'];
    const rows: any[][] = [];
    hipotesis.forEach(h => {
      const obsLimpia = h.observaciones?.replace(/\n/g, " ").replace(/"/g, "'") || "";
      const evLimpia = h.evidencia ? `"${h.evidencia}"` : "";
      if (!h.subtareas || h.subtareas.length === 0) {
        rows.push([h.id, h.gerencia, `"${h.nombre}"`, `"${h.responsable}"`, h.fechaInicio, h.fechaLimite, h.presupuestoAsignado, h.presupuestoGastado, h.avance, h.estatus, h.veredicto, evLimpia, `"${obsLimpia}"`, "", ""]);
      } else {
        h.subtareas.forEach(sub => {
          const subTexto = sub.texto.replace(/\n/g, " ").replace(/"/g, "'");
          rows.push([h.id, h.gerencia, `"${h.nombre}"`, `"${h.responsable}"`, h.fechaInicio, h.fechaLimite, h.presupuestoAsignado, h.presupuestoGastado, h.avance, h.estatus, h.veredicto, evLimpia, `"${obsLimpia}"`, `"${subTexto}"`, sub.completada ? "Completada" : "Pendiente"]);
        });
      }
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `Subtek_Metricas_BI_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); link.remove();
  };

  if (!isClient) return <div className="p-8 text-white">Cargando plataforma SUBTEK...</div>;

  const hipotesisFiltradas = gerenciaActiva === 'Dashboard Global' ? hipotesis : hipotesis.filter(h => h.gerencia === gerenciaActiva);
  const activasAsignado = hipotesis.filter(h => h.estatus !== 'Finalizado').reduce((acc, curr) => acc + (curr.presupuestoAsignado || 0), 0);
  const finalizadasGastado = hipotesis.filter(h => h.estatus === 'Finalizado').reduce((acc, curr) => acc + (curr.presupuestoGastado || 0), 0);
  const presupuestoDisponible = presupuestoTotalSubtek - activasAsignado - finalizadasGastado;
  const validadas = hipotesis.filter(h => h.veredicto === 'Validada').length;

  return (
    <div className="min-h-screen flex flex-col bg-subtek-dark text-slate-100 font-sans">
      {/* MODAL DE BORRADO */}
      {modalBorrar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm transition-all duration-300">
          <div className="bg-subtek-card border border-subtek-cyan p-6 rounded-xl max-w-md w-full shadow-[0_0_30px_rgba(0,240,255,0.2)]">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><AlertTriangle className="text-red-500" /> Confirmar Eliminación</h3>
            <p className="text-slate-300 mb-6">¿Estás absolutamente seguro de borrar este proyecto? Se perderá permanentemente del sistema.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setModalBorrar(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-all">Cancelar</button>
              <button onClick={confirmarBorrado} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-all">Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER CORPORATIVO */}
      <header className="bg-[#1a0f2e] border-b border-subtek-cyan/30 p-4 sticky top-0 z-50 shadow-md shadow-subtek-cyan/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <img src="/logo.jpg" alt="Subtek Logo" className="h-10 rounded shadow-[0_0_10px_rgba(0,240,255,0.3)]" onError={(e) => e.currentTarget.style.display = 'none'} />
            <div className="flex flex-col"><span className="text-xl font-black tracking-widest text-white">SUBTEK</span><span className="text-xs font-semibold tracking-widest text-subtek-cyan uppercase">Plataforma Lean SaaS</span></div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded border shadow-lg ${syncStatus.includes('ONLINE') ? 'text-green-400 bg-green-950/40 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'text-orange-400 bg-orange-950/40 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.2)]'}`}>
               {syncStatus.includes('ONLINE') && (
                 <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                 </span>
               )}
               {syncStatus}
            </span>
            <button onClick={exportarCSV} className="flex items-center gap-2 bg-transparent border border-subtek-cyan hover:bg-subtek-cyan hover:text-black text-subtek-cyan px-4 py-2 rounded transition-all duration-300 hover:scale-105 font-medium shadow-[0_0_10px_rgba(0,240,255,0.1)]"><Download size={18} /> Exportar (BI)</button>
          </div>
        </div>
      </header>

      {/* MASCOTA SUBI */}
      <div className="bg-gradient-to-r from-subtek-blue to-[#1a0f2e] border-b border-subtek-cyan/20 p-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <img src="/subi.jpg" alt="Subi" className="w-16 h-16 rounded-full border-2 border-subtek-cyan object-cover shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:scale-110 transition-all duration-300" onError={(e) => e.currentTarget.style.display = 'none'} />
          <div className="text-sm md:text-base text-slate-300">
            <span className="font-bold text-subtek-cyan text-lg">¡Hola equipo, soy Subi! 🤖</span> <br/>
            El sistema ha activado la <b>Arquitectura Híbrida</b>. Tu información está 100% a salvo de recargas de página porque se guarda instantáneamente de forma local, y en segundo plano sincroniza con nuestra base de datos. ¡Iteremos sin miedo!
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {/* NAVEGACIÓN */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-700 pb-2">
          {GERENCIAS.map(g => (
            <button key={g} onClick={() => setGerenciaActiva(g)} className={`px-4 py-2 rounded-t-lg font-medium transition-all duration-300 flex items-center gap-2 ${gerenciaActiva === g ? 'bg-subtek-cyan text-black shadow-[0_-4px_15px_rgba(0,240,255,0.3)] transform -translate-y-1' : 'bg-subtek-card text-slate-400 hover:text-white hover:bg-slate-700'}`}>
              {g === 'Dashboard Global' && <BarChart3 size={16} />}{g}
            </button>
          ))}
        </div>

        {/* WORKSPACE HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold border-l-4 border-subtek-cyan pl-3">
            {gerenciaActiva === 'Dashboard Global' ? 'Visión 360° y Flujo de Caja' : `Workspace: ${gerenciaActiva}`}
          </h2>
          {gerenciaActiva !== 'Dashboard Global' && (
            <button onClick={agregarHipotesis} className="flex items-center gap-2 bg-subtek-cyan text-black font-bold px-4 py-2 rounded transition-all duration-300 hover:scale-105 hover:shadow-[0_0_15px_rgba(0,240,255,0.5)]"><Plus size={20} /> Nuevo Proyecto</button>
          )}
        </div>

        {/* VISTA DASHBOARD GLOBAL */}
        {gerenciaActiva === 'Dashboard Global' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-subtek-card p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center shadow-lg col-span-2 md:col-span-4 bg-gradient-to-r from-subtek-blue to-[#1a0f2e]">
              <span className="text-subtek-cyan text-sm font-bold mb-2 uppercase tracking-widest">Fondo Total Disponible (Subtek)</span>
              <div className="flex items-center justify-center gap-2">
                 <span className="text-4xl font-black text-white">$</span>
                 <input type="number" placeholder="Ingrese Ppto Total" className="bg-transparent text-4xl font-black text-white outline-none text-center border-b border-slate-600 focus:border-subtek-cyan w-64 transition-colors cursor-not-allowed opacity-90" value={presupuestoTotalSubtek || ''} disabled={true} title="Editable en Gerencia General" />
              </div>
            </div>
            <div className="bg-subtek-card p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center shadow-lg"><span className="text-slate-400 text-sm font-bold mb-1">P. Reservado (Activas)</span><span className="text-2xl font-black text-blue-400">${activasAsignado.toLocaleString()}</span></div>
            <div className="bg-subtek-card p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center shadow-lg"><span className="text-slate-400 text-sm font-bold mb-1">P. Quemado (Finalizadas)</span><span className="text-2xl font-black text-red-400">${finalizadasGastado.toLocaleString()}</span></div>
            <div className="bg-subtek-card p-4 rounded-xl border border-subtek-cyan/50 flex flex-col items-center justify-center text-center shadow-[0_0_15px_rgba(0,240,255,0.2)]"><span className="text-subtek-cyan text-sm font-bold mb-1">Caja Estimada Restante</span><span className={`text-3xl font-black ${presupuestoDisponible < 0 ? 'text-red-500' : 'text-green-400'}`}>${presupuestoDisponible.toLocaleString()}</span></div>
            <div className="bg-subtek-card p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center shadow-lg"><span className="text-slate-400 text-sm font-bold mb-1">Proyectos / Validados</span><span className="text-2xl font-black text-white">{hipotesis.length} / <span className="text-green-400">{validadas}</span></span></div>
          </div>
        )}

        {gerenciaActiva === 'Gerencia General' && (
           <div className="mb-8 bg-subtek-card p-4 rounded-xl border border-subtek-cyan/50 flex flex-col items-start shadow-[0_0_15px_rgba(0,240,255,0.1)]">
             <span className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-widest flex items-center gap-2"><Info size={14}/> Configuración Global</span>
             <div className="flex items-center gap-2 w-full max-w-md">
                <span className="text-lg font-black text-subtek-cyan">Fondo Total Subtek: $</span>
                <input type="number" placeholder="Ej: 50000" className="bg-slate-800 border border-slate-700 rounded p-2 outline-none focus:border-subtek-cyan transition-colors flex-1 text-white" value={presupuestoTotalSubtek || ''} onChange={(e) => guardarPresupuestoTotal(Number(e.target.value))} />
             </div>
           </div>
        )}

        {/* GRID DE TARJETAS DE PROYECTO */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pb-20">
          {hipotesisFiltradas.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl"><p className="text-lg">No hay proyectos activos aquí. Haz clic en "Nuevo Proyecto".</p></div>
          ) : (
            hipotesisFiltradas.map((hip) => {
              const presupuestoValido = hip.presupuestoAsignado > 0;
              const burnRate = presupuestoValido ? (hip.presupuestoGastado / hip.presupuestoAsignado) * 100 : 0;
              let semaforoColor = 'bg-subtek-card border-slate-700';
              let alertaActiva = false;
              const isGlobal = gerenciaActiva === 'Dashboard Global';
              
              if (presupuestoValido) {
                 if (burnRate > 80 && hip.avance < 50) { semaforoColor = 'bg-red-950/30 border-red-500/50'; alertaActiva = true;
                 } else if (burnRate > 90) { semaforoColor = 'bg-orange-950/30 border-orange-500/50'; }
              }
              if (hip.estatus === 'Finalizado' && hip.veredicto === 'Validada') semaforoColor = 'bg-green-950/20 border-green-500/40';
              if (hip.estatus === 'Finalizado' && hip.veredicto === 'Refutada') semaforoColor = 'bg-slate-900 border-slate-600 opacity-70';

              return (
                <div key={hip.id} className={`p-6 rounded-xl border ${semaforoColor} flex flex-col gap-5 shadow-xl transition-all duration-500 hover:shadow-2xl relative overflow-hidden ${isGlobal ? 'opacity-90' : ''}`}>
                  <div className="flex justify-between gap-4 items-start">
                    <div className="w-full">
                      {isGlobal && <span className="text-[10px] bg-subtek-cyan text-black font-bold px-2 py-0.5 rounded mb-2 inline-block uppercase tracking-wider">{hip.gerencia}</span>}
                      <input type="text" placeholder="Ej: Piloto de IA..." className={`bg-transparent border-b border-slate-600 focus:border-subtek-cyan outline-none w-full text-xl font-bold placeholder-slate-600 pb-1 transition-colors ${isGlobal ? 'cursor-not-allowed opacity-80' : ''}`} value={hip.nombre} onChange={(e) => actualizarHipotesis(hip.id, 'nombre', e.target.value)} disabled={isGlobal} />
                    </div>
                    {!isGlobal && <button onClick={() => setModalBorrar(hip.id)} className="text-slate-500 hover:text-red-400 p-2 rounded hover:bg-slate-800 transition-all duration-300"><Trash2 size={20} /></button>}
                  </div>

                  {alertaActiva && <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/50 p-3 rounded border border-red-900 animate-pulse"><AlertTriangle size={16} /> ¡Peligro! Alto consumo de capital frente a bajo avance.</div>}

                  {/* BLOQUE SUPERIOR */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Estatus</label>
                      <select className={`bg-slate-800 border border-slate-700 rounded p-2 text-sm outline-none focus:border-subtek-cyan transition-colors ${isGlobal ? 'cursor-not-allowed opacity-80' : ''}`} value={hip.estatus} onChange={(e) => actualizarHipotesis(hip.id, 'estatus', e.target.value)} disabled={isGlobal}>
                        <option value="Sin iniciar">Sin iniciar</option><option value="En curso">En curso</option><option value="Finalizado">Finalizado</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Veredicto</label>
                      <select className={`bg-slate-800 border border-slate-700 rounded p-2 text-sm outline-none transition-colors ${hip.estatus !== 'Finalizado' || isGlobal ? 'opacity-50 cursor-not-allowed' : 'focus:border-subtek-cyan'}`} value={hip.veredicto} disabled={hip.estatus !== 'Finalizado' || isGlobal} onChange={(e) => actualizarHipotesis(hip.id, 'veredicto', e.target.value)}>
                        <option value="Pendiente">Pendiente</option><option value="Validada">✅ Éxito</option><option value="Refutada">❌ Aprendizaje</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1"><Users size={12}/> Responsable</label>
                      <select className={`bg-slate-800 border border-slate-700 rounded p-2 text-sm outline-none focus:border-subtek-cyan transition-colors w-full ${isGlobal ? 'cursor-not-allowed opacity-80' : ''}`} value={hip.responsable} onChange={(e) => actualizarHipotesis(hip.id, 'responsable', e.target.value)} disabled={isGlobal}>
                        <option value="">Seleccionar...</option>{RESPONSABLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* BLOQUE MEDIO */}
                  <div className="bg-[#111827] border border-slate-700/50 rounded-lg p-4 grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1"><label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1"><Calendar size={12}/> Fecha Inicio</label><input type="date" className={`bg-transparent border-b border-slate-700 outline-none focus:border-subtek-cyan transition-colors w-full text-sm text-slate-300 ${isGlobal ? 'cursor-not-allowed opacity-80' : ''}`} value={hip.fechaInicio} onChange={(e) => actualizarHipotesis(hip.id, 'fechaInicio', e.target.value)} disabled={isGlobal} /></div>
                    <div className="flex flex-col gap-1"><label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1"><Calendar size={12}/> Fecha Límite</label><input type="date" className={`bg-transparent border-b border-slate-700 outline-none focus:border-subtek-cyan transition-colors w-full text-sm text-slate-300 ${isGlobal ? 'cursor-not-allowed opacity-80' : ''}`} value={hip.fechaLimite} onChange={(e) => actualizarHipotesis(hip.id, 'fechaLimite', e.target.value)} disabled={isGlobal} /></div>
                    <div className="flex flex-col gap-1"><label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">P. Asignado ($)</label><input type="number" placeholder="0" className={`bg-transparent border-b border-slate-700 outline-none focus:border-subtek-cyan transition-colors w-full text-lg text-white ${isGlobal ? 'cursor-not-allowed opacity-80' : ''}`} value={hip.presupuestoAsignado || ''} onChange={(e) => actualizarHipotesis(hip.id, 'presupuestoAsignado', Number(e.target.value))} disabled={isGlobal} /></div>
                    <div className="flex flex-col gap-1"><label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">P. Gastado ($)</label><input type="number" placeholder="0" className={`bg-transparent border-b border-slate-700 outline-none focus:border-red-400 transition-colors w-full text-lg text-red-400 ${isGlobal ? 'cursor-not-allowed opacity-80' : ''}`} value={hip.presupuestoGastado || ''} onChange={(e) => actualizarHipotesis(hip.id, 'presupuestoGastado', Number(e.target.value))} disabled={isGlobal} /></div>
                    <div className="col-span-2 flex flex-col gap-2 pt-2 border-t border-slate-800">
                      <div className="flex justify-between items-center text-xs"><label className="text-slate-400 uppercase font-bold flex items-center gap-1"><TrendingUp size={14}/> Progreso</label><span className="text-subtek-cyan font-black text-lg">{hip.avance}%</span></div>
                      <input type="range" min="0" max="100" className={`w-full accent-subtek-cyan ${isGlobal ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`} value={hip.avance} onChange={(e) => actualizarHipotesis(hip.id, 'avance', Number(e.target.value))} disabled={isGlobal} />
                    </div>
                  </div>

                  {/* BLOQUE INFERIOR */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                       <label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1"><CheckSquare size={14}/> Subtareas</label>
                       <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 flex flex-col gap-2 h-44 overflow-y-auto">
                          {(hip.subtareas || []).map(sub => (
                            <div key={sub.id} className="flex items-start gap-2 group">
                              <input type="checkbox" checked={sub.completada} onChange={() => toggleSubtarea(hip.id, sub.id)} className={`mt-1 accent-subtek-cyan ${isGlobal ? 'cursor-not-allowed' : 'cursor-pointer'}`} disabled={isGlobal} />
                              <span className={`text-sm flex-1 ${sub.completada ? 'line-through text-slate-500' : 'text-slate-200'}`}>{sub.texto}</span>
                              {!isGlobal && <button onClick={() => borrarSubtarea(hip.id, sub.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>}
                            </div>
                          ))}
                          {!isGlobal && <input type="text" placeholder="+ Escribir y Enter..." className="bg-transparent border-b border-slate-600 focus:border-subtek-cyan outline-none text-sm text-subtek-cyan placeholder-slate-600 w-full mt-auto py-1" onKeyDown={(e) => { if (e.key === 'Enter') { agregarSubtarea(hip.id, e.currentTarget.value); e.currentTarget.value = ''; } }} />}
                       </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1"><label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1"><Info size={14}/> Observaciones</label><textarea placeholder="Anota aquí lecciones..." className={`bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:border-subtek-cyan h-24 resize-none text-slate-300 w-full leading-relaxed ${isGlobal ? 'cursor-not-allowed opacity-80' : ''}`} value={hip.observaciones || ''} onChange={(e) => actualizarHipotesis(hip.id, 'observaciones', e.target.value)} disabled={isGlobal} /></div>
                      <div className="flex flex-col gap-1"><label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1"><LinkIcon size={14}/> Evidencia (URL)</label><input type="url" placeholder="https://drive.google.com/..." className={`bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:border-subtek-cyan transition-colors w-full text-subtek-cyan placeholder-slate-600 ${isGlobal ? 'cursor-not-allowed opacity-80' : ''}`} value={hip.evidencia || ''} onChange={(e) => actualizarHipotesis(hip.id, 'evidencia', e.target.value)} disabled={isGlobal} /></div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
