"use client";
import React, { useState, useEffect } from 'react';
import { 
  Download, Plus, Save, Trash2, 
  CheckCircle, Clock, AlertTriangle, TrendingUp, Info, BarChart3, X
} from 'lucide-react';

type Gerencia = 'Dashboard Global' | 'General' | 'Producto' | 'Comercial' | 'Procesos y Proyectos';
type Estatus = 'Sin iniciar' | 'En curso' | 'Finalizado';
type Veredicto = 'Pendiente' | 'Validada' | 'Refutada';

interface Hipotesis {
  id: string;
  gerencia: Gerencia;
  nombre: string;
  presupuestoAsignado: number;
  presupuestoGastado: number;
  fechaInicio: string;
  fechaLimite: string;
  avance: number;
  estatus: Estatus;
  veredicto: Veredicto;
  colaboradores: number;
  observaciones: string;
  actividades: string;
}

const GERENCIAS: Gerencia[] = ['Dashboard Global', 'General', 'Producto', 'Comercial', 'Procesos y Proyectos'];

export default function SubtekDashboard() {
  const [hipotesis, setHipotesis] = useState<Hipotesis[]>([]);
  const [gerenciaActiva, setGerenciaActiva] = useState<Gerencia>('Dashboard Global');
  const [isClient, setIsClient] = useState(false);
  const [modalBorrar, setModalBorrar] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('subtek-hipotesis');
    if (saved) setHipotesis(JSON.parse(saved));
  }, []);

  const guardarDatos = (data: Hipotesis[]) => {
    setHipotesis(data);
    localStorage.setItem('subtek-hipotesis', JSON.stringify(data));
  };

  const agregarHipotesis = () => {
    const nueva: Hipotesis = {
      id: Math.random().toString(36).substr(2, 9),
      gerencia: gerenciaActiva === 'Dashboard Global' ? 'General' : gerenciaActiva,
      nombre: '',
      presupuestoAsignado: 0,
      presupuestoGastado: 0,
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaLimite: '',
      avance: 0,
      estatus: 'Sin iniciar',
      veredicto: 'Pendiente',
      colaboradores: 1,
      observaciones: '',
      actividades: ''
    };
    guardarDatos([nueva, ...hipotesis]);
    if (gerenciaActiva === 'Dashboard Global') setGerenciaActiva('General');
  };

  const actualizarHipotesis = (id: string, campo: keyof Hipotesis, valor: any) => {
    const act = hipotesis.map(h => h.id === id ? { ...h, [campo]: valor } : h);
    guardarDatos(act);
  };

  const confirmarBorrado = () => {
    if (modalBorrar) {
      guardarDatos(hipotesis.filter(h => h.id !== modalBorrar));
      setModalBorrar(null);
    }
  };

  const exportarCSV = () => {
    const headers = ['ID', 'Gerencia', 'Nombre/Hipotesis', 'P. Asignado', 'P. Gastado', 'Inicio', 'Limite', 'Avance %', 'Estatus', 'Veredicto'];
    const rows = hipotesis.map(h => [
      h.id, h.gerencia, `"${h.nombre}"`, h.presupuestoAsignado, h.presupuestoGastado, 
      h.fechaInicio, h.fechaLimite, h.avance, h.estatus, h.veredicto
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Subtek_Metricas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (!isClient) return <div className="p-8 text-white">Cargando plataforma SUBTEK...</div>;

  const hipotesisFiltradas = gerenciaActiva === 'Dashboard Global' ? hipotesis : hipotesis.filter(h => h.gerencia === gerenciaActiva);
  
  // Cálculos para el Dashboard Global
  const totalAsignado = hipotesis.reduce((acc, curr) => acc + curr.presupuestoAsignado, 0);
  const totalGastado = hipotesis.reduce((acc, curr) => acc + curr.presupuestoGastado, 0);
  const validadas = hipotesis.filter(h => h.veredicto === 'Validada').length;

  return (
    <div className="min-h-screen flex flex-col bg-subtek-dark text-slate-100 font-sans">
      
      {/* MODAL DE CONFIRMACIÓN DE BORRADO */}
      {modalBorrar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm transition-all duration-300">
          <div className="bg-subtek-card border border-subtek-cyan p-6 rounded-xl max-w-md w-full shadow-[0_0_30px_rgba(0,240,255,0.2)]">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <AlertTriangle className="text-red-500" /> Confirmar Eliminación
            </h3>
            <p className="text-slate-300 mb-6">¿Estás absolutamente seguro de borrar este proyecto? Se perderá todo el historial de presupuesto y avance. Esta acción no se puede deshacer.</p>
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
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-widest text-white">SUBTEK</span>
              <span className="text-xs font-semibold tracking-widest text-subtek-cyan uppercase">Plataforma Lean SaaS</span>
            </div>
          </div>
          <button onClick={exportarCSV} className="flex items-center gap-2 bg-transparent border border-subtek-cyan hover:bg-subtek-cyan hover:text-black text-subtek-cyan px-4 py-2 rounded transition-all duration-300 hover:scale-105 font-medium shadow-[0_0_10px_rgba(0,240,255,0.1)]">
            <Download size={18} /> Exportar Métricas (BI)
          </button>
        </div>
      </header>

      {/* MASCOTA SUBI */}
      <div className="bg-gradient-to-r from-subtek-blue to-[#1a0f2e] border-b border-subtek-cyan/20 p-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <img src="/subi.jpg" alt="Subi" className="w-16 h-16 rounded-full border-2 border-subtek-cyan object-cover shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:scale-110 transition-all duration-300" onError={(e) => e.currentTarget.style.display = 'none'} />
          <div className="text-sm md:text-base text-slate-300">
            <span className="font-bold text-subtek-cyan text-lg">¡Hola equipo, soy Subi! 🤖</span> <br/>
            Nuestro enfoque es el dato. Recuerden mantener los presupuestos y fechas actualizados. Si un proyecto fracasa, márquenlo como "Refutado" (es aprendizaje), si tiene éxito, márquenlo como "Validado". ¡A iterar!
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        
        {/* NAVEGACIÓN DE PESTAÑAS */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-700 pb-2">
          {GERENCIAS.map(g => (
            <button key={g} onClick={() => setGerenciaActiva(g)} className={`px-4 py-2 rounded-t-lg font-medium transition-all duration-300 flex items-center gap-2 ${gerenciaActiva === g ? 'bg-subtek-cyan text-black shadow-[0_-4px_15px_rgba(0,240,255,0.3)] transform -translate-y-1' : 'bg-subtek-card text-slate-400 hover:text-white hover:bg-slate-700'}`}>
              {g === 'Dashboard Global' && <BarChart3 size={16} />}
              {g}
            </button>
          ))}
        </div>

        {/* WORKSPACE HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold border-l-4 border-subtek-cyan pl-3">
            {gerenciaActiva === 'Dashboard Global' ? 'Visión 360° de Proyectos' : `Workspace: ${gerenciaActiva}`}
          </h2>
          {gerenciaActiva !== 'Dashboard Global' && (
            <button onClick={agregarHipotesis} className="flex items-center gap-2 bg-subtek-cyan text-black font-bold px-4 py-2 rounded transition-all duration-300 hover:scale-105 hover:shadow-[0_0_15px_rgba(0,240,255,0.5)]">
              <Plus size={20} /> Nuevo Proyecto / Hipótesis
            </button>
          )}
        </div>

        {/* VISTA DASHBOARD GLOBAL */}
        {gerenciaActiva === 'Dashboard Global' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-subtek-card p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center shadow-lg hover:border-subtek-cyan transition-colors">
              <span className="text-slate-400 font-bold mb-2">Total Proyectos</span>
              <span className="text-4xl font-black text-white">{hipotesis.length}</span>
            </div>
            <div className="bg-subtek-card p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center shadow-lg hover:border-subtek-cyan transition-colors">
              <span className="text-slate-400 font-bold mb-2">Hipótesis Validadas</span>
              <span className="text-4xl font-black text-green-400">{validadas}</span>
            </div>
            <div className="bg-subtek-card p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center shadow-lg hover:border-subtek-cyan transition-colors">
              <span className="text-slate-400 font-bold mb-2">Presupuesto Asignado</span>
              <span className="text-3xl font-black text-subtek-cyan">${totalAsignado.toLocaleString()}</span>
            </div>
            <div className="bg-subtek-card p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center shadow-lg hover:border-subtek-cyan transition-colors">
              <span className="text-slate-400 font-bold mb-2">Presupuesto Quemado</span>
              <span className="text-3xl font-black text-red-400">${totalGastado.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* GRID DE TARJETAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
          {hipotesisFiltradas.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
              <p className="text-lg">No hay proyectos activos aquí. Haz clic en "Nuevo Proyecto" para empezar.</p>
            </div>
          ) : (
            hipotesisFiltradas.map((hip) => {
              const presupuestoValido = hip.presupuestoAsignado > 0;
              const burnRate = presupuestoValido ? (hip.presupuestoGastado / hip.presupuestoAsignado) * 100 : 0;
              let semaforoColor = 'bg-subtek-card border-slate-700';
              let alertaActiva = false;
              
              if (presupuestoValido) {
                 if (burnRate > 80 && hip.avance < 50) {
                    semaforoColor = 'bg-red-950/40 border-red-500/50';
                    alertaActiva = true;
                 } else if (burnRate > 90) { semaforoColor = 'bg-orange-950/40 border-orange-500/50'; }
              }
              if (hip.estatus === 'Finalizado' && hip.veredicto === 'Validada') semaforoColor = 'bg-green-950/30 border-green-500/50';
              if (hip.estatus === 'Finalizado' && hip.veredicto === 'Refutada') semaforoColor = 'bg-slate-900 border-slate-600 opacity-70';

              return (
                <div key={hip.id} className={`p-6 rounded-xl border ${semaforoColor} flex flex-col gap-4 shadow-lg transition-all duration-500 hover:shadow-xl`}>
                  
                  <div className="flex justify-between gap-4 items-start">
                    <div className="w-full">
                      {gerenciaActiva === 'Dashboard Global' && <span className="text-xs bg-subtek-cyan text-black font-bold px-2 py-1 rounded mb-2 inline-block">{hip.gerencia}</span>}
                      <input type="text" placeholder="Ej: Implementar IA para etiquetado NASSCO..."
                        className="bg-transparent border-b border-slate-600 focus:border-subtek-cyan outline-none w-full text-lg font-bold placeholder-slate-600 pb-1 transition-colors"
                        value={hip.nombre} onChange={(e) => actualizarHipotesis(hip.id, 'nombre', e.target.value)}
                      />
                    </div>
                    <button onClick={() => setModalBorrar(hip.id)} className="text-slate-500 hover:text-red-400 p-2 rounded hover:bg-slate-800 transition-all duration-300" title="Borrar Proyecto">
                      <Trash2 size={20} />
                    </button>
                  </div>

                  {alertaActiva && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/50 p-3 rounded border border-red-900 animate-pulse">
                      <AlertTriangle size={16} /> ¡Peligro! Alto consumo de capital frente a bajo avance.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-xs uppercase font-bold">Estatus</label>
                      <select className="bg-slate-800 border border-slate-700 rounded p-2 outline-none focus:border-subtek-cyan transition-colors" value={hip.estatus} onChange={(e) => actualizarHipotesis(hip.id, 'estatus', e.target.value)}>
                        <option value="Sin iniciar">Sin iniciar</option><option value="En curso">En curso</option><option value="Finalizado">Finalizado</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-xs uppercase font-bold">Veredicto</label>
                      <select className={`bg-slate-800 border border-slate-700 rounded p-2 outline-none transition-colors ${hip.estatus !== 'Finalizado' ? 'opacity-50 cursor-not-allowed' : 'focus:border-subtek-cyan'}`} value={hip.veredicto} disabled={hip.estatus !== 'Finalizado'} onChange={(e) => actualizarHipotesis(hip.id, 'veredicto', e.target.value)}>
                        <option value="Pendiente">Pendiente</option><option value="Validada">✅ Éxito (Validada)</option><option value="Refutada">❌ Aprendizaje (Refutada)</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-xs uppercase font-bold">Presupuesto ($)</label>
                      <input type="number" className="bg-slate-800 border border-slate-700 rounded p-2 outline-none focus:border-subtek-cyan transition-colors w-full" value={hip.presupuestoAsignado} onChange={(e) => actualizarHipotesis(hip.id, 'presupuestoAsignado', Number(e.target.value))} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-xs uppercase font-bold">Gastado (Burn) ($)</label>
                      <input type="number" className="bg-slate-800 border border-slate-700 rounded p-2 outline-none focus:border-red-400 transition-colors w-full text-red-300" value={hip.presupuestoGastado} onChange={(e) => actualizarHipotesis(hip.id, 'presupuestoGastado', Number(e.target.value))} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-4 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <div className="flex justify-between items-center text-xs">
                      <label className="text-slate-400 uppercase font-bold flex items-center gap-1"><TrendingUp size={14}/> Progreso de Ejecución</label>
                      <span className="text-subtek-cyan font-black text-base">{hip.avance}%</span>
                    </div>
                    <input type="range" min="0" max="100" className="w-full accent-subtek-cyan cursor-pointer" value={hip.avance} onChange={(e) => actualizarHipotesis(hip.id, 'avance', Number(e.target.value))} />
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
