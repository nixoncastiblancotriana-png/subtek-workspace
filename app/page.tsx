"use client";
import React, { useState, useEffect } from 'react';
import { 
  Download, Plus, Save, Trash2, 
  CheckCircle, Clock, AlertTriangle, TrendingUp, Info
} from 'lucide-react';

type Gerencia = 'General' | 'Producto' | 'Comercial' | 'Procesos y Proyectos';
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

const GERENCIAS: Gerencia[] = ['General', 'Producto', 'Comercial', 'Procesos y Proyectos'];

export default function SubtekDashboard() {
  const [hipotesis, setHipotesis] = useState<Hipotesis[]>([]);
  const [gerenciaActiva, setGerenciaActiva] = useState<Gerencia>('General');
  const [isClient, setIsClient] = useState(false);

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
      gerencia: gerenciaActiva,
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
  };

  const actualizarHipotesis = (id: string, campo: keyof Hipotesis, valor: any) => {
    const act = hipotesis.map(h => h.id === id ? { ...h, [campo]: valor } : h);
    guardarDatos(act);
  };

  const eliminarHipotesis = (id: string) => {
    if(confirm('¿Seguro que deseas eliminar esta hipótesis?')) {
      guardarDatos(hipotesis.filter(h => h.id !== id));
    }
  };

  const exportarCSV = () => {
    const headers = ['ID', 'Gerencia', 'Nombre/Hipotesis', 'Presupuesto Asignado', 'Presupuesto Gastado', 'Fecha Inicio', 'Fecha Limite', 'Avance %', 'Estatus', 'Veredicto', 'Colaboradores', 'Observaciones', 'Actividades'];
    const rows = hipotesis.map(h => [
      h.id, h.gerencia, `"${h.nombre}"`, h.presupuestoAsignado, h.presupuestoGastado, 
      h.fechaInicio, h.fechaLimite, h.avance, h.estatus, h.veredicto, 
      h.colaboradores, `"${h.observaciones}"`, `"${h.actividades}"`
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

  if (!isClient) return <div className="p-8 text-white">Cargando tablero...</div>;

  const hipotesisFiltradas = hipotesis.filter(h => h.gerencia === gerenciaActiva);

  return (
    <div className="min-h-screen flex flex-col bg-subtek-dark text-slate-100">
      
      {/* HEADER / NAVIGATION */}
      <header className="bg-subtek-blue border-b border-subtek-cyan/20 p-4 sticky top-0 z-50 shadow-md shadow-subtek-cyan/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-subtek-cyan text-subtek-blue font-black px-3 py-1 rounded text-2xl tracking-widest">
              SUBTEK
            </div>
            <span className="text-sm font-semibold tracking-wide text-subtek-cyan uppercase">
              Lean Workspace
            </span>
          </div>
          <button 
            onClick={exportarCSV}
            className="flex items-center gap-2 bg-subtek-card border border-subtek-cyan/50 hover:bg-subtek-cyan hover:text-subtek-blue text-subtek-cyan px-4 py-2 rounded transition-all font-medium"
          >
            <Download size={18} /> Exportar a CSV para BI
          </button>
        </div>
      </header>

      {/* SUBI - MASCOT WIDGET */}
      <div className="bg-gradient-to-r from-subtek-accent/20 to-subtek-cyan/10 border-b border-subtek-cyan/30 p-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-subtek-card border-2 border-subtek-cyan flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.4)]">
             <span className="text-2xl" title="Mascota Subi">🤖</span>
          </div>
          <div className="text-sm md:text-base text-slate-200">
            <span className="font-bold text-subtek-cyan">¡Hola! Soy Subi. </span> 
            Recuerda que debes validar tu hipótesis, poner las fechas reales, el presupuesto que has gastado y dejar observaciones en tu workspace. ¡El éxito de nuestra startup depende de la medición constante!
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        
        {/* GERENCIAS TABS */}
        <div className="flex flex-wrap gap-2 mb-8">
          {GERENCIAS.map(g => (
            <button
              key={g}
              onClick={() => setGerenciaActiva(g)}
              className={`px-4 py-3 rounded-t-lg font-medium transition-all ${gerenciaActiva === g ? 'bg-subtek-cyan text-subtek-blue shadow-[0_-4px_10px_rgba(0,240,255,0.2)]' : 'bg-subtek-card text-slate-400 hover:text-white'}`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* WORKSPACE HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold border-l-4 border-subtek-cyan pl-3">Workspace: {gerenciaActiva}</h2>
          <button 
            onClick={agregarHipotesis}
            className="flex items-center gap-2 bg-subtek-cyan text-subtek-blue font-bold px-4 py-2 rounded hover:brightness-110 transition-all"
          >
            <Plus size={20} /> Nueva Hipótesis
          </button>
        </div>

        {/* HIPOTESIS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
          {hipotesisFiltradas.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
              <p>No hay hipótesis en este workspace. Haz clic en "Nueva Hipótesis" para comenzar a iterar.</p>
            </div>
          ) : (
            hipotesisFiltradas.map((hip) => {
              // Calculo de semáforo (Burn rate vs Avance)
              const presupuestoValido = hip.presupuestoAsignado > 0;
              const burnRate = presupuestoValido ? (hip.presupuestoGastado / hip.presupuestoAsignado) * 100 : 0;
              let semaforoColor = 'bg-subtek-card border-slate-700';
              let alertaActiva = false;
              
              if (presupuestoValido) {
                 if (burnRate > 80 && hip.avance < 50) {
                    semaforoColor = 'bg-red-950/40 border-red-500/50';
                    alertaActiva = true;
                 } else if (burnRate > 90) {
                    semaforoColor = 'bg-orange-950/40 border-orange-500/50';
                 }
              }
              if (hip.estatus === 'Finalizado' && hip.veredicto === 'Validada') {
                 semaforoColor = 'bg-green-950/30 border-green-500/50';
              }

              return (
                <div key={hip.id} className={`p-5 rounded-xl border ${semaforoColor} flex flex-col gap-4 shadow-lg`}>
                  
                  {/* Titulo y Acciones */}
                  <div className="flex justify-between gap-4">
                    <input 
                      type="text" 
                      placeholder="Ej: Si ofrecemos 14 días gratis, cerramos 3 B2B..."
                      className="bg-transparent border-b border-slate-600 focus:border-subtek-cyan outline-none w-full text-lg font-bold placeholder-slate-600 pb-1"
                      value={hip.nombre}
                      onChange={(e) => actualizarHipotesis(hip.id, 'nombre', e.target.value)}
                    />
                    <button onClick={() => eliminarHipotesis(hip.id)} className="text-slate-500 hover:text-red-400 p-1">
                      <Trash2 size={20} />
                    </button>
                  </div>

                  {/* Alerta de Burn Rate */}
                  {alertaActiva && (
                    <div className="flex items-center gap-2 text-red-400 text-xs bg-red-950/50 p-2 rounded border border-red-900">
                      <AlertTriangle size={14} /> Alto consumo de presupuesto con bajo avance.
                    </div>
                  )}

                  {/* Grid de Metricas */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {/* Estatus */}
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-xs uppercase font-semibold">Estatus</label>
                      <select 
                        className="bg-slate-800 border border-slate-700 rounded p-1.5 outline-none focus:border-subtek-cyan"
                        value={hip.estatus}
                        onChange={(e) => actualizarHipotesis(hip.id, 'estatus', e.target.value)}
                      >
                        <option value="Sin iniciar">Sin iniciar</option>
                        <option value="En curso">En curso</option>
                        <option value="Finalizado">Finalizado</option>
                      </select>
                    </div>

                    {/* Veredicto (Solo si Finalizado) */}
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-xs uppercase font-semibold">Veredicto</label>
                      <select 
                        className={`bg-slate-800 border border-slate-700 rounded p-1.5 outline-none focus:border-subtek-cyan ${hip.estatus !== 'Finalizado' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        value={hip.veredicto}
                        disabled={hip.estatus !== 'Finalizado'}
                        onChange={(e) => actualizarHipotesis(hip.id, 'veredicto', e.target.value)}
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="Validada">✅ Validada (Éxito)</option>
                        <option value="Refutada">❌ Refutada (Aprendizaje)</option>
                      </select>
                    </div>

                    {/* Presupuesto */}
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-xs uppercase font-semibold">P. Asignado ($)</label>
                      <input 
                        type="number" className="bg-slate-800 border border-slate-700 rounded p-1.5 outline-none w-full"
                        value={hip.presupuestoAsignado} onChange={(e) => actualizarHipotesis(hip.id, 'presupuestoAsignado', Number(e.target.value))}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-xs uppercase font-semibold">P. Gastado ($)</label>
                      <input 
                        type="number" className="bg-slate-800 border border-slate-700 rounded p-1.5 outline-none w-full text-red-300"
                        value={hip.presupuestoGastado} onChange={(e) => actualizarHipotesis(hip.id, 'presupuestoGastado', Number(e.target.value))}
                      />
                    </div>

                    {/* Fechas */}
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-xs uppercase font-semibold flex items-center gap-1"><Clock size={12}/> Inicio</label>
                      <input 
                        type="date" className="bg-slate-800 border border-slate-700 rounded p-1.5 outline-none w-full text-xs"
                        value={hip.fechaInicio} onChange={(e) => actualizarHipotesis(hip.id, 'fechaInicio', e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-xs uppercase font-semibold flex items-center gap-1"><Clock size={12}/> Límite/Real</label>
                      <input 
                        type="date" className="bg-slate-800 border border-slate-700 rounded p-1.5 outline-none w-full text-xs"
                        value={hip.fechaLimite} onChange={(e) => actualizarHipotesis(hip.id, 'fechaLimite', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Progreso */}
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex justify-between items-center text-xs">
                      <label className="text-slate-400 uppercase font-semibold flex items-center gap-1"><TrendingUp size={12}/> % Avance</label>
                      <span className="text-subtek-cyan font-bold">{hip.avance}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" className="w-full accent-subtek-cyan"
                      value={hip.avance} onChange={(e) => actualizarHipotesis(hip.id, 'avance', Number(e.target.value))}
                    />
                  </div>

                  {/* RRHH y Textos */}
                  <div className="flex items-center gap-2 mt-2 border-t border-slate-700 pt-4">
                    <label className="text-slate-400 text-xs uppercase font-semibold whitespace-nowrap">Colaboradores:</label>
                    <input 
                      type="number" min="0" className="bg-slate-800 border border-slate-700 rounded p-1 w-16 text-center text-sm outline-none"
                      value={hip.colaboradores} onChange={(e) => actualizarHipotesis(hip.id, 'colaboradores', Number(e.target.value))}
                    />
                  </div>

                  <div className="flex flex-col gap-1 mt-2">
                    <label className="text-slate-400 text-xs uppercase font-semibold">Actividades Clave (Hitos)</label>
                    <textarea 
                      placeholder="- Hito 1\n- Hito 2"
                      className="bg-slate-800 border border-slate-700 rounded p-2 text-sm outline-none focus:border-subtek-cyan h-16 resize-none"
                      value={hip.actividades} onChange={(e) => actualizarHipotesis(hip.id, 'actividades', e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-slate-400 text-xs uppercase font-semibold flex items-center gap-1"><Info size={12}/> Observaciones / Workspace</label>
                    <textarea 
                      placeholder="Anota aquí aprendizajes, bloqueos o insights..."
                      className="bg-slate-800 border border-slate-700 rounded p-2 text-sm outline-none focus:border-subtek-cyan h-20 resize-none text-subtek-cyan"
                      value={hip.observaciones} onChange={(e) => actualizarHipotesis(hip.id, 'observaciones', e.target.value)}
                    />
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
