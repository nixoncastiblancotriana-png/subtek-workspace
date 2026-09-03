"use client";
import React, { useState, useEffect } from 'react';
import { 
  Download, Plus, Trash2, Users, Link as LinkIcon,
  AlertTriangle, TrendingUp, Info, BarChart3, CheckSquare, X
} from 'lucide-react';

type Gerencia = 'Dashboard Global' | 'Gerencia General' | 'Gerencia de Producto' | 'Gerencia Comercial' | 'Gerencia de Procesos y Proyectos';
type Estatus = 'Sin iniciar' | 'En curso' | 'Finalizado';
type Veredicto = 'Pendiente' | 'Validada' | 'Refutada';

interface Subtarea {
  id: string;
  texto: string;
  completada: boolean;
}

interface Hipotesis {
  id: string;
  gerencia: Gerencia;
  nombre: string;
  responsable: string;
  presupuestoAsignado: number;
  presupuestoGastado: number;
  avance: number;
  estatus: Estatus;
  veredicto: Veredicto;
  observaciones: string;
  evidencia: string;
  subtareas: Subtarea[];
}

const GERENCIAS: Gerencia[] = ['Dashboard Global', 'Gerencia General', 'Gerencia de Producto', 'Gerencia Comercial', 'Gerencia de Procesos y Proyectos'];
const RESPONSABLES = ['Nixon Castiblanco', 'Edwin Escalante', 'Daniel Arevalo', 'Lis Gordillo'];

export default function SubtekDashboard() {
  const [hipotesis, setHipotesis] = useState<Hipotesis[]>([]);
  const [presupuestoTotalSubtek, setPresupuestoTotalSubtek] = useState<number>(0);
  const [gerenciaActiva, setGerenciaActiva] = useState<Gerencia>('Dashboard Global');
  const [isClient, setIsClient] = useState(false);
  const [modalBorrar, setModalBorrar] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('subtek-hipotesis');
    if (saved) setHipotesis(JSON.parse(saved));
    
    const savedPpto = localStorage.getItem('subtek-presupuesto');
    if (savedPpto) setPresupuestoTotalSubtek(Number(savedPpto));
  }, []);

  const guardarDatos = (data: Hipotesis[]) => {
    setHipotesis(data);
    localStorage.setItem('subtek-hipotesis', JSON.stringify(data));
  };

  const guardarPresupuestoTotal = (valor: number) => {
    setPresupuestoTotalSubtek(valor);
    localStorage.setItem('subtek-presupuesto', valor.toString());
  };

  const agregarHipotesis = () => {
    const nueva: Hipotesis = {
      id: Math.random().toString(36).substr(2, 9),
      gerencia: gerenciaActiva === 'Dashboard Global' ? 'Gerencia General' : gerenciaActiva,
      nombre: '',
      responsable: '',
      presupuestoAsignado: 0,
      presupuestoGastado: 0,
      avance: 0,
      estatus: 'Sin iniciar',
      veredicto: 'Pendiente',
      observaciones: '',
      evidencia: '',
      subtareas: []
    };
    guardarDatos([nueva, ...hipotesis]);
    if (gerenciaActiva === 'Dashboard Global') setGerenciaActiva('Gerencia General');
  };

  const actualizarHipotesis = (id: string, campo: keyof Hipotesis, valor: any) => {
    const act = hipotesis.map(h => h.id === id ? { ...h, [campo]: valor } : h);
    guardarDatos(act);
  };

  // --- Manejo de Subtareas ---
  const agregarSubtarea = (idHipotesis: string, textoSubtarea: string) => {
    if (!textoSubtarea.trim()) return;
    const act = hipotesis.map(h => {
      if (h.id === idHipotesis) {
        return { 
          ...h, 
          subtareas: [...h.subtareas, { id: Math.random().toString(36).substr(2, 5), texto: textoSubtarea, completada: false }] 
        };
      }
      return h;
    });
    guardarDatos(act);
  };

  const toggleSubtarea = (idHipotesis: string, idSubtarea: string) => {
    const act = hipotesis.map(h => {
      if (h.id === idHipotesis) {
        const nuevasSubtareas = h.subtareas.map(s => s.id === idSubtarea ? { ...s, completada: !s.completada } : s);
        return { ...h, subtareas: nuevasSubtareas };
      }
      return h;
    });
    guardarDatos(act);
  };

  const borrarSubtarea = (idHipotesis: string, idSubtarea: string) => {
    const act = hipotesis.map(h => {
      if (h.id === idHipotesis) {
        return { ...h, subtareas: h.subtareas.filter(s => s.id !== idSubtarea) };
      }
      return h;
    });
    guardarDatos(act);
  };
  // ---------------------------

  const confirmarBorrado = () => {
    if (modalBorrar) {
      guardarDatos(hipotesis.filter(h => h.id !== modalBorrar));
      setModalBorrar(null);
    }
  };

  const exportarCSV = () => {
    const headers = ['ID', 'Gerencia', 'Nombre_Proyecto', 'Responsable', 'P_Asignado', 'P_Gastado', 'Avance_Porcentaje', 'Estatus', 'Veredicto', 'Evidencia_URL', 'Observaciones', 'Subtarea_Texto', 'Subtarea_Estado'];
    const rows: any[][] = [];

    hipotesis.forEach(h => {
      const obsLimpia = h.observaciones.replace(/\n/g, " ").replace(/"/g, "'");
      const evLimpia = h.evidencia ? `"${h.evidencia}"` : "";

      // Transformación estructurada para BI: 1 fila por cada subtarea
      if (h.subtareas.length === 0) {
        rows.push([
          h.id, h.gerencia, `"${h.nombre}"`, `"${h.responsable}"`, h.presupuestoAsignado, h.presupuestoGastado, 
          h.avance, h.estatus, h.veredicto, evLimpia, `"${obsLimpia}"`, "", ""
        ]);
      } else {
        h.subtareas.forEach(sub => {
          const subTexto = sub.texto.replace(/\n/g, " ").replace(/"/g, "'");
          const subEstado = sub.completada ? "Completada" : "Pendiente";
          rows.push([
            h.id, h.gerencia, `"${h.nombre}"`, `"${h.responsable}"`, h.presupuestoAsignado, h.presupuestoGastado, 
            h.avance, h.estatus, h.veredicto, evLimpia, `"${obsLimpia}"`, `"${subTexto}"`, subEstado
          ]);
        });
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Subtek_Metricas_BI_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (!isClient) return <div className="p-8 text-white">Cargando plataforma SUBTEK...</div>;

  const hipotesisFiltradas = gerenciaActiva === 'Dashboard Global' ? hipotesis : hipotesis.filter(h => h.gerencia === gerenciaActiva);
  
  // Lógica Financiera de Subtek
  const activasAsignado = hipotesis.filter(h => h.estatus !== 'Finalizado').reduce((acc, curr) => acc + curr.presupuestoAsignado, 0);
  const finalizadasGastado = hipotesis.filter(h => h.estatus === 'Finalizado').reduce((acc, curr) => acc + curr.presupuestoGastado, 0);
  const presupuestoDisponible = presupuestoTotalSubtek - activasAsignado - finalizadasGastado;
  
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
            <p className="text-slate-300 mb-6">¿Estás absolutamente seguro de borrar este proyecto? Se perderá todo el historial de presupuesto, observaciones y avance. Esta acción no se puede deshacer.</p>
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
            La exportación a BI ha sido optimizada. Ahora cada gerente debe adjuntar la <b>ruta de evidencia</b> de sus validaciones. Además, el presupuesto disponible se calcula en tiempo real restando el capital <i>asignado</i> (activo) y el <i>gastado</i> (finalizado).
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
            {gerenciaActiva === 'Dashboard Global' ? 'Visión 360° y Flujo de Caja' : `Workspace: ${gerenciaActiva}`}
          </h2>
          {gerenciaActiva !== 'Dashboard Global' && (
            <button onClick={agregarHipotesis} className="flex items-center gap-2 bg-subtek-cyan text-black font-bold px-4 py-2 rounded transition-all duration-300 hover:scale-105 hover:shadow-[0_0_15px_rgba(0,240,255,0.5)]">
              <Plus size={20} /> Nuevo Proyecto
            </button>
          )}
        </div>

        {/* VISTA DASHBOARD GLOBAL */}
        {gerenciaActiva === 'Dashboard Global' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {/* Presupuesto Total Editable */}
            <div className="bg-subtek-card p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center shadow-lg col-span-2 md:col-span-4 bg-gradient-to-r from-subtek-blue to-[#1a0f2e]">
              <span className="text-subtek-cyan text-sm font-bold mb-2 uppercase tracking-widest">Fondo Total Disponible (Subtek)</span>
              <div className="flex items-center justify-center gap-2">
                 <span className="text-4xl font-black text-white">$</span>
                 <input 
                    type="number" 
                    placeholder="Ingrese Presupuesto Total"
                    className="bg-transparent text-4xl font-black text-white outline-none text-center border-b border-slate-600 focus:border-subtek-cyan w-64 transition-colors" 
                    value={presupuestoTotalSubtek || ''} 
                    onChange={(e) => guardarPresupuestoTotal(Number(e.target.value))} 
                 />
              </div>
            </div>

            <div className="bg-subtek-card p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center shadow-lg hover:border-subtek-cyan transition-colors">
              <span className="text-slate-400 text-sm font-bold mb-1">P. Reservado (Activas)</span>
              <span className="text-2xl font-black text-blue-400">${activasAsignado.toLocaleString()}</span>
            </div>
            <div className="bg-subtek-card p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center shadow-lg hover:border-subtek-cyan transition-colors">
              <span className="text-slate-400 text-sm font-bold mb-1">P. Quemado (Finalizadas)</span>
              <span className="text-2xl font-black text-red-400">${finalizadasGastado.toLocaleString()}</span>
            </div>
            <div className="bg-subtek-card p-4 rounded-xl border border-subtek-cyan/50 flex flex-col items-center justify-center text-center shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              <span className="text-subtek-cyan text-sm font-bold mb-1">Caja Estimada Restante</span>
              <span className={`text-3xl font-black ${presupuestoDisponible < 0 ? 'text-red-500' : 'text-green-400'}`}>
                ${presupuestoDisponible.toLocaleString()}
              </span>
            </div>
            <div className="bg-subtek-card p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center shadow-lg hover:border-subtek-cyan transition-colors">
              <span className="text-slate-400 text-sm font-bold mb-1">Proyectos Totales / Validados</span>
              <span className="text-2xl font-black text-white">{hipotesis.length} / <span className="text-green-400">{validadas}</span></span>
            </div>
          </div>
        )}

        {/* GRID DE TARJETAS DE PROYECTO */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pb-20">
          {hipotesisFiltradas.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
              <p className="text-lg">No hay proyectos activos aquí. Haz clic en "Nuevo Proyecto" para empezar a iterar.</p>
            </div>
          ) : (
            hipotesisFiltradas.map((hip) => {
              const presupuestoValido = hip.presupuestoAsignado > 0;
              const burnRate = presupuestoValido ? (hip.presupuestoGastado / hip.presupuestoAsignado) * 100 : 0;
              let semaforoColor = 'bg-subtek-card border-slate-700';
              let alertaActiva = false;
              
              if (presupuestoValido) {
                 if (burnRate > 80 && hip.avance < 50) {
                    semaforoColor = 'bg-red-950/30 border-red-500/50';
                    alertaActiva = true;
                 } else if (burnRate > 90) { semaforoColor = 'bg-orange-950/30 border-orange-500/50'; }
              }
              if (hip.estatus === 'Finalizado' && hip.veredicto === 'Validada') semaforoColor = 'bg-green-950/20 border-green-500/40';
              if (hip.estatus === 'Finalizado' && hip.veredicto === 'Refutada') semaforoColor = 'bg-slate-900 border-slate-600 opacity-70';

              return (
                <div key={hip.id} className={`p-6 rounded-xl border ${semaforoColor} flex flex-col gap-5 shadow-xl transition-all duration-500 hover:shadow-2xl relative overflow-hidden`}>
                  
                  {/* Titulo y Borrar */}
                  <div className="flex justify-between gap-4 items-start">
                    <div className="w-full">
                      {gerenciaActiva === 'Dashboard Global' && <span className="text-[10px] bg-subtek-cyan text-black font-bold px-2 py-0.5 rounded mb-2 inline-block uppercase tracking-wider">{hip.gerencia}</span>}
                      <input type="text" placeholder="Ej: Piloto de IA para etiquetado NASSCO v8..."
                        className="bg-transparent border-b border-slate-600 focus:border-subtek-cyan outline-none w-full text-xl font-bold placeholder-slate-600 pb-1 transition-colors"
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

                  {/* BLOQUE SUPERIOR: Estatus, Veredicto y Responsable */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Estatus</label>
                      <select className="bg-slate-800 border border-slate-700 rounded p-2 text-sm outline-none focus:border-subtek-cyan transition-colors" value={hip.estatus} onChange={(e) => actualizarHipotesis(hip.id, 'estatus', e.target.value)}>
                        <option value="Sin iniciar">Sin iniciar</option><option value="En curso">En curso</option><option value="Finalizado">Finalizado</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Veredicto</label>
                      <select className={`bg-slate-800 border border-slate-700 rounded p-2 text-sm outline-none transition-colors ${hip.estatus !== 'Finalizado' ? 'opacity-50 cursor-not-allowed' : 'focus:border-subtek-cyan'}`} value={hip.veredicto} disabled={hip.estatus !== 'Finalizado'} onChange={(e) => actualizarHipotesis(hip.id, 'veredicto', e.target.value)}>
                        <option value="Pendiente">Pendiente</option><option value="Validada">✅ Éxito</option><option value="Refutada">❌ Aprendizaje</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1"><Users size={12}/> Responsable</label>
                      <select className="bg-slate-800 border border-slate-700 rounded p-2 text-sm outline-none focus:border-subtek-cyan transition-colors w-full" value={hip.responsable} onChange={(e) => actualizarHipotesis(hip.id, 'responsable', e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {RESPONSABLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* BLOQUE MEDIO: Finanzas y Avance */}
                  <div className="bg-[#111827] border border-slate-700/50 rounded-lg p-4 grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Presupuesto Asignado ($)</label>
                      <input type="number" placeholder="0" className="bg-transparent border-b border-slate-700 outline-none focus:border-subtek-cyan transition-colors w-full text-lg text-white" value={hip.presupuestoAsignado || ''} onChange={(e) => actualizarHipotesis(hip.id, 'presupuestoAsignado', Number(e.target.value))} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Presupuesto Gastado ($)</label>
                      <input type="number" placeholder="0" className="bg-transparent border-b border-slate-700 outline-none focus:border-red-400 transition-colors w-full text-lg text-red-400" value={hip.presupuestoGastado || ''} onChange={(e) => actualizarHipotesis(hip.id, 'presupuestoGastado', Number(e.target.value))} />
                    </div>
                    
                    <div className="col-span-2 flex flex-col gap-2 pt-2 border-t border-slate-800">
                      <div className="flex justify-between items-center text-xs">
                        <label className="text-slate-400 uppercase font-bold flex items-center gap-1"><TrendingUp size={14}/> Progreso de Ejecución</label>
                        <span className="text-subtek-cyan font-black text-lg">{hip.avance}%</span>
                      </div>
                      <input type="range" min="0" max="100" className="w-full accent-subtek-cyan cursor-pointer" value={hip.avance} onChange={(e) => actualizarHipotesis(hip.id, 'avance', Number(e.target.value))} />
                    </div>
                  </div>

                  {/* BLOQUE INFERIOR: Subtareas, Evidencia y Observaciones */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Subtareas */}
                    <div className="flex flex-col gap-2">
                       <label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1"><CheckSquare size={14}/> Subtareas Operativas</label>
                       <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 flex flex-col gap-2 h-44 overflow-y-auto">
                          {hip.subtareas.map(sub => (
                            <div key={sub.id} className="flex items-start gap-2 group">
                              <input type="checkbox" checked={sub.completada} onChange={() => toggleSubtarea(hip.id, sub.id)} className="mt-1 accent-subtek-cyan cursor-pointer" />
                              <span className={`text-sm flex-1 ${sub.completada ? 'line-through text-slate-500' : 'text-slate-200'}`}>{sub.texto}</span>
                              <button onClick={() => borrarSubtarea(hip.id, sub.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                            </div>
                          ))}
                          <input 
                            type="text" 
                            placeholder="+ Escribir y presionar Enter..."
                            className="bg-transparent border-b border-slate-600 focus:border-subtek-cyan outline-none text-sm text-subtek-cyan placeholder-slate-600 w-full mt-auto py-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                agregarSubtarea(hip.id, e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                       </div>
                    </div>

                    {/* Observaciones y Evidencia */}
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1"><Info size={14}/> Observaciones</label>
                        <textarea 
                          placeholder="Anota aquí lecciones, bloqueos o insights..."
                          className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:border-subtek-cyan h-24 resize-none text-slate-300 w-full leading-relaxed"
                          value={hip.observaciones} onChange={(e) => actualizarHipotesis(hip.id, 'observaciones', e.target.value)}
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1"><LinkIcon size={14}/> Ruta de Evidencia (URL)</label>
                        <input 
                          type="url" 
                          placeholder="https://drive.google.com/..."
                          className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:border-subtek-cyan transition-colors w-full text-subtek-cyan placeholder-slate-600"
                          value={hip.evidencia} onChange={(e) => actualizarHipotesis(hip.id, 'evidencia', e.target.value)}
                        />
                      </div>
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
