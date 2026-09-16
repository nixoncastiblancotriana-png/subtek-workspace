// @ts-nocheck
"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Download, Plus, Trash2, Users, Link as LinkIcon,
  AlertTriangle, TrendingUp, Info, BarChart3, CheckSquare, X, Calendar, CloudUpload, Map,
  Camera, Droplets, Video, Cloud, Tag, Cpu, Eye, Zap, PieChart, CheckCircle2, ArrowDown,
  Building, Phone, Mail, Target, Award
} from 'lucide-react';

// ==========================================
// 🚀 CONEXIÓN A LA NUBE DE SUBTEK
const SUPABASE_URL = 'https://fzjovmnudqbwukyzsznc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rxf7CQsMHtXx-Ndo1RpE5A_52kMOtb3'; 
// ==========================================

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type Gerencia = 'Roadmap Ecosistema' | 'Dashboard Global' | 'Gerencia General' | 'Gerencia de Producto' | 'Gerencia Comercial' | 'Gerencia de Procesos y Proyectos' | 'Clientes Subtek';
type Estatus = 'Sin iniciar' | 'En curso' | 'Finalizado';
type Veredicto = 'Pendiente' | 'Validada' | 'Refutada';

interface Subtarea { id: string; texto: string; completada: boolean; }

interface Hipotesis {
  id: string; gerencia: Gerencia; nombre: string; responsable: string;
  presupuestoAsignado: number; presupuestoGastado: number; fechaInicio: string; fechaLimite: string;
  avance: number; estatus: Estatus; veredicto: Veredicto; observaciones: string; evidencia: string; subtareas: Subtarea[];
}

interface ClienteSubtek {
  id: string; empresa: string; nombreContacto: string; telefono: string; correo: string;
  esCliente: boolean; estado: string; estadoActual: string; proximoPaso: string; origen: string;
  referidoPor?: string; // NUEVO CAMPO ESTRATÉGICO
}

const GERENCIAS: Gerencia[] = ['Roadmap Ecosistema', 'Dashboard Global', 'Clientes Subtek', 'Gerencia General', 'Gerencia de Producto', 'Gerencia Comercial', 'Gerencia de Procesos y Proyectos'];
const RESPONSABLES = ['Nixon Castiblanco', 'Edwin Escalante', 'Daniel Arevalo', 'Lis Gordillo'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const ESTADOS_CLIENTE = [
  "Prospecto o contacto inicial", 
  "Cotización enviada", 
  "Pendiente respuesta", 
  "Cliente activo o con interacción reciente", 
  "Oportunidad detenida o sin respuesta por mas de 2 semanas"
];

const ORIGEN_CLIENTE = [
  "Página web", 
  "Referido", 
  "Redes sociales", 
  "Evento empresarial", 
  "Soporte tecnico Welltep", 
  "Otro"
];

export default function SubtekDashboard() {
  const [hipotesis, setHipotesis] = useState<Hipotesis[]>([]);
  const [clientes, setClientes] = useState<ClienteSubtek[]>([]);
  const [presupuestoTotalSubtek, setPresupuestoTotalSubtek] = useState<number>(0);
  const [mesPpto, setMesPpto] = useState<string>('Septiembre');
  const [anioPpto, setAnioPpto] = useState<number>(2026);
  const [gerenciaActiva, setGerenciaActiva] = useState<Gerencia>('Dashboard Global');
  
  const [roadmap, setRoadmap] = useState({
    fase1_cctv: true, fase1_vactor: true, fase1_inspeccion: true,
    fase2_saas: false, fase2_etiquetador: false, fase2_recomendaciones: false, fase2_vision: false,
    fase3_predictivo: false, fase3_vision_rt: false, fase3_macp: false
  });

  const [isClient, setIsClient] = useState(false);
  const [datosCargados, setDatosCargados] = useState(false);
  const [modalBorrar, setModalBorrar] = useState<string | null>(null);
  const [modalBorrarCliente, setModalBorrarCliente] = useState<string | null>(null);
  const [hayCambiosLocales, setHayCambiosLocales] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // 1. CARGA INICIAL
  useEffect(() => {
    setIsClient(true);
    try {
      const saved = localStorage.getItem('subtek-data-v6');
      if (saved && saved !== '[]') setHipotesis(JSON.parse(saved));
      const savedClientes = localStorage.getItem('subtek-clientes-v6');
      if (savedClientes && savedClientes !== '[]') setClientes(JSON.parse(savedClientes));
      
      const savedPpto = localStorage.getItem('subtek-ppto-v6');
      if (savedPpto) setPresupuestoTotalSubtek(Number(savedPpto));
      const savedMes = localStorage.getItem('subtek-ppto-mes-v6');
      if (savedMes) setMesPpto(savedMes);
      const savedAnio = localStorage.getItem('subtek-ppto-anio-v6');
      if (savedAnio) setAnioPpto(Number(savedAnio));
      const savedRoadmap = localStorage.getItem('subtek-roadmap-v6');
      if (savedRoadmap) setRoadmap(JSON.parse(savedRoadmap));
    } catch (e) { console.error("Error lectura local:", e); }
    
    setDatosCargados(true);
    cargarDatosNube();
  }, []);

  // 2. GUARDADO LOCAL AUTOMÁTICO
  useEffect(() => {
    if (isClient && datosCargados) {
      localStorage.setItem('subtek-data-v6', JSON.stringify(hipotesis));
      localStorage.setItem('subtek-clientes-v6', JSON.stringify(clientes));
      localStorage.setItem('subtek-ppto-v6', presupuestoTotalSubtek.toString());
      localStorage.setItem('subtek-ppto-mes-v6', mesPpto);
      localStorage.setItem('subtek-ppto-anio-v6', anioPpto.toString());
      localStorage.setItem('subtek-roadmap-v6', JSON.stringify(roadmap));
    }
  }, [hipotesis, clientes, presupuestoTotalSubtek, mesPpto, anioPpto, roadmap, isClient, datosCargados]);

  // 3. FUNCIONES DE NUBE
  const cargarDatosNube = async () => {
    try {
      const { data: hipData } = await supabase.from('hipotesis').select('*');
      if (hipData && hipData.length > 0) setHipotesis(hipData as Hipotesis[]);
      
      const { data: clData } = await supabase.from('clientes').select('*');
      if (clData && clData.length > 0) setClientes(clData as ClienteSubtek[]);

      const { data: pptoData } = await supabase.from('presupuesto_global').select('total').eq('id', 1).single();
      if (pptoData) setPresupuestoTotalSubtek(pptoData.total);
    } catch (error: any) { console.error("Error nube:", error.message); }
  };

  const forzarGuardadoNube = async () => {
    setIsSyncing(true);
    try {
      if (hipotesis.length > 0) {
        const { error: errorHip } = await supabase.from('hipotesis').upsert(hipotesis);
        if (errorHip) throw new Error("Error en proyectos: " + errorHip.message);
      }
      if (clientes.length > 0) {
        const { error: errorCl } = await supabase.from('clientes').upsert(clientes);
        if (errorCl) throw new Error("Error en clientes: " + errorCl.message);
      }
      const { error: errorPpto } = await supabase.from('presupuesto_global').upsert({ id: 1, total: presupuestoTotalSubtek });
      if (errorPpto) throw new Error("Error en presupuesto: " + errorPpto.message);

      setHayCambiosLocales(false);
      alert("¡Sincronización exitosa! Los datos están seguros en la nube de Subtek.");
    } catch (error: any) {
      alert("ATENCIÓN: No se pudo guardar en la nube.\nMotivo: " + (error.message || "Error desconocido"));
    } finally {
      setIsSyncing(false);
    }
  };

  // 4. FUNCIONES DE MODIFICACIÓN - CLIENTES
  const agregarCliente = () => {
    const nuevo: ClienteSubtek = {
      id: Math.random().toString(36).substr(2, 9), empresa: '', nombreContacto: '', telefono: '', correo: '',
      esCliente: false, estado: 'Prospecto o contacto inicial', estadoActual: '', proximoPaso: '', origen: 'Página web', referidoPor: ''
    };
    setClientes([nuevo, ...clientes]);
    setHayCambiosLocales(true);
  };

  const actualizarCliente = (id: string, campo: keyof ClienteSubtek, valor: any) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, [campo]: valor } : c));
    setHayCambiosLocales(true);
  };

  const confirmarBorradoCliente = async () => {
    if (modalBorrarCliente) {
      setClientes(prev => prev.filter(c => c.id !== modalBorrarCliente));
      try { await supabase.from('clientes').delete().eq('id', modalBorrarCliente); } catch(e){}
      setModalBorrarCliente(null);
      setHayCambiosLocales(true);
    }
  };

  // 5. EXPORTACIÓN BI
  const exportarClientesCSV = () => {
    const headers = ['ID', 'Empresa', 'Contacto', 'Telefono', 'Correo', 'Es_Cliente', 'Estado', 'Estado_Actual', 'Proximo_Paso', 'Origen', 'Referido_Por'];
    const rows = clientes.map(c => [
      c.id, `"${c.empresa}"`, `"${c.nombreContacto}"`, `"${c.telefono}"`, `"${c.correo}"`, 
      c.esCliente ? 'SI' : 'NO', `"${c.estado}"`, `"${c.estadoActual.replace(/\n/g, " ")}"`, `"${c.proximoPaso.replace(/\n/g, " ")}"`, `"${c.origen}"`, `"${(c.referidoPor || '').replace(/\n/g, " ")}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `Subtek_Clientes_BI_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); link.remove();
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
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `Subtek_Proyectos_BI_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); link.remove();
  };

  // RESTO DE FUNCIONES
  const toggleRoadmap = (id: string) => { setRoadmap(prev => ({ ...prev, [id]: !prev[id] })); setHayCambiosLocales(true); };
  const guardarPresupuestoTotal = async (valor: number) => { setPresupuestoTotalSubtek(valor); setHayCambiosLocales(true); };
  const congelarPresupuestoMensual = () => { setHayCambiosLocales(true); alert(`✅ Presupuesto de ${mesPpto} ${anioPpto} congelado en $${presupuestoTotalSubtek.toLocaleString()}.\n\nNo olvides hacer clic en "¡Guardar en Servidor!".`); };
  
  const agregarHipotesis = () => {
    const nueva: Hipotesis = {
      id: Math.random().toString(36).substr(2, 9), gerencia: gerenciaActiva === 'Dashboard Global' || gerenciaActiva === 'Roadmap Ecosistema' ? 'Gerencia General' : gerenciaActiva,
      nombre: '', responsable: '', presupuestoAsignado: 0, presupuestoGastado: 0, fechaInicio: new Date().toISOString().split('T')[0], fechaLimite: '', avance: 0, estatus: 'Sin iniciar', veredicto: 'Pendiente', observaciones: '', evidencia: '', subtareas: []
    };
    setHipotesis([nueva, ...hipotesis]); setHayCambiosLocales(true);
    if (gerenciaActiva === 'Dashboard Global' || gerenciaActiva === 'Roadmap Ecosistema') setGerenciaActiva('Gerencia General');
  };

  const actualizarHipotesis = (id: string, campo: keyof Hipotesis, valor: any) => { setHipotesis(prev => prev.map(h => h.id === id ? { ...h, [campo]: valor } : h)); setHayCambiosLocales(true); };
  const agregarSubtarea = (id: string, txt: string) => { if (!txt.trim()) return; setHipotesis(prev => prev.map(h => h.id === id ? { ...h, subtareas: [...(h.subtareas || []), { id: Math.random().toString(36).substr(2, 5), texto: txt, completada: false }] } : h)); setHayCambiosLocales(true); };
  const toggleSubtarea = (idHip: string, idSub: string) => { setHipotesis(prev => prev.map(h => h.id === idHip ? { ...h, subtareas: h.subtareas.map(s => s.id === idSub ? { ...s, completada: !s.completada } : s) } : h)); setHayCambiosLocales(true); };
  const borrarSubtarea = (idHip: string, idSub: string) => { setHipotesis(prev => prev.map(h => h.id === idHip ? { ...h, subtareas: h.subtareas.filter(s => s.id !== idSub) } : h)); setHayCambiosLocales(true); };
  const confirmarBorrado = async () => {
    if (modalBorrar) { setHipotesis(prev => prev.filter(h => h.id !== modalBorrar)); try { await supabase.from('hipotesis').delete().eq('id', modalBorrar); } catch(e){} setModalBorrar(null); setHayCambiosLocales(true); }
  };

  const RoadmapCard = ({ id, title, subtitle, icon: Icon, state }: { id: string, title: string, subtitle: string, icon: any, state: boolean }) => (
    <div onClick={() => toggleRoadmap(id)} className={`cursor-pointer relative overflow-hidden p-5 rounded-2xl border-2 transition-all duration-500 flex flex-col items-center text-center w-56 h-40 justify-center z-20 group ${state ? 'bg-gradient-to-br from-[#1a0f2e] to-[#0a0514] border-subtek-cyan shadow-[0_0_30px_rgba(0,240,255,0.25)] transform hover:-translate-y-2 scale-105' : 'bg-slate-900/40 border-slate-700/50 opacity-60 hover:opacity-100 hover:border-slate-500 hover:bg-slate-800/80 transform hover:-translate-y-1'}`}>
      {state && <div className="absolute top-3 right-3 animate-pulse"><CheckCircle2 size={20} className="text-subtek-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.9)]" /></div>}
      <div className={`p-3 rounded-full mb-3 transition-colors duration-500 ${state ? 'bg-subtek-cyan/10' : 'bg-slate-800 group-hover:bg-slate-700'}`}><Icon size={32} className={`${state ? 'text-subtek-cyan drop-shadow-[0_0_5px_rgba(0,240,255,0.6)]' : 'text-slate-500 group-hover:text-slate-300'}`} /></div>
      <h3 className={`text-sm font-black leading-tight mb-1 ${state ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{title}</h3><span className={`text-[10px] font-semibold uppercase tracking-wider ${state ? 'text-subtek-cyan' : 'text-slate-600 group-hover:text-slate-400'}`}>{subtitle}</span>
    </div>
  );

  if (!isClient) return <div className="p-8 text-white">Cargando plataforma SUBTEK...</div>;

  const hipotesisFiltradas = (gerenciaActiva === 'Dashboard Global' || gerenciaActiva === 'Roadmap Ecosistema' || gerenciaActiva === 'Clientes Subtek') ? hipotesis : hipotesis.filter(h => h.gerencia === gerenciaActiva);
  const activasAsignado = hipotesis.filter(h => h.estatus !== 'Finalizado').reduce((acc, curr) => acc + (curr.presupuestoAsignado || 0), 0);
  const finalizadasGastado = hipotesis.filter(h => h.estatus === 'Finalizado').reduce((acc, curr) => acc + (curr.presupuestoGastado || 0), 0);
  const presupuestoDisponible = presupuestoTotalSubtek - activasAsignado - finalizadasGastado;
  const validadas = hipotesis.filter(h => h.veredicto === 'Validada').length;

  // Calculos CRM
  const totalClientes = clientes.length;
  const clientesConvertidos = clientes.filter(c => c.esCliente).length;
  const porcentajeClientes = totalClientes === 0 ? 0 : Math.round((clientesConvertidos / totalClientes) * 100);

  return (
    <div className="min-h-screen flex flex-col bg-subtek-dark text-slate-100 font-sans">
      {/* MODALES DE BORRADO */}
      {modalBorrar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm transition-all duration-300">
          <div className="bg-subtek-card border border-subtek-cyan p-6 rounded-xl max-w-md w-full shadow-[0_0_30px_rgba(0,240,255,0.2)]">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><AlertTriangle className="text-red-500" /> Confirmar Eliminación</h3>
            <p className="text-slate-300 mb-6">¿Estás seguro de borrar este proyecto? Se perderá permanentemente del sistema.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setModalBorrar(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-all">Cancelar</button>
              <button onClick={confirmarBorrado} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-all">Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}
      
      {modalBorrarCliente && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm transition-all duration-300">
          <div className="bg-subtek-card border border-subtek-cyan p-6 rounded-xl max-w-md w-full shadow-[0_0_30px_rgba(0,240,255,0.2)]">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><AlertTriangle className="text-red-500" /> Eliminar Prospecto B2B</h3>
            <p className="text-slate-300 mb-6">¿Deseas eliminar este registro comercial de la base de datos de Subtek?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setModalBorrarCliente(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-all">Cancelar</button>
              <button onClick={confirmarBorradoCliente} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-all">Sí, Eliminar</button>
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
            <button onClick={forzarGuardadoNube} disabled={isSyncing} className={`flex items-center gap-2 px-5 py-2 rounded font-bold shadow-lg transition-all duration-300 hover:scale-105 ${hayCambiosLocales ? 'bg-orange-500 text-white animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]'}`}>
              <CloudUpload size={20} /> {isSyncing ? 'Guardando...' : hayCambiosLocales ? '¡Guardar en Servidor!' : 'Nube Sincronizada'}
            </button>
            {gerenciaActiva === 'Clientes Subtek' ? (
              <button onClick={exportarClientesCSV} className="flex items-center gap-2 bg-subtek-cyan text-black font-bold px-4 py-2 rounded transition-all hover:scale-105 shadow-[0_0_10px_rgba(0,240,255,0.3)]"><Download size={18} /> Exportar CRM (BI)</button>
            ) : (
              <button onClick={exportarCSV} className="flex items-center gap-2 bg-transparent border border-subtek-cyan text-subtek-cyan hover:bg-subtek-cyan hover:text-black px-4 py-2 rounded transition-all hover:scale-105 font-medium"><Download size={18} /> Exportar (BI)</button>
            )}
          </div>
        </div>
      </header>

      {/* MASCOTA SUBI */}
      <div className="bg-gradient-to-r from-subtek-blue to-[#1a0f2e] border-b border-subtek-cyan/20 p-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <img src="/subi.jpg" alt="Subi" className="w-16 h-16 rounded-full border-2 border-subtek-cyan object-cover shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:scale-110 transition-all duration-300" onError={(e) => e.currentTarget.style.display = 'none'} />
          <div className="text-sm md:text-base text-slate-300">
            <span className="font-bold text-subtek-cyan text-lg">¡Hola equipo, soy Subi! 🤖</span> <br/>
            Esta es la aplicación oficial para validar las hipótesis comerciales de Subtek. Por favor consignemos aquí todos nuestros proyectos: mantengan actualizados los responsables, fechas, presupuestos y no olviden incluir la ruta de la evidencia. ¡Lo que no se mide, no se mejora, así que a iterar rápido para llevar a Subtek al siguiente nivel! 🚀📈💪
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {/* NAVEGACIÓN */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-700 pb-2">
          {GERENCIAS.map(g => (
            <button key={g} onClick={() => setGerenciaActiva(g)} className={`px-4 py-2 rounded-t-lg font-medium transition-all duration-300 flex items-center gap-2 ${gerenciaActiva === g ? 'bg-subtek-cyan text-black shadow-[0_-4px_15px_rgba(0,240,255,0.3)] transform -translate-y-1' : 'bg-subtek-card text-slate-400 hover:text-white hover:bg-slate-700'}`}>
              {g === 'Dashboard Global' && <BarChart3 size={16} />}
              {g === 'Roadmap Ecosistema' && <Map size={16} />}
              {g === 'Clientes Subtek' && <Users size={16} />}
              {g}
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* NUEVA SECCIÓN: CLIENTES SUBTEK (MÓDULO CRM B2B CON SEMÁFORO) */}
        {/* ========================================================================= */}
        {gerenciaActiva === 'Clientes Subtek' && (
          <div className="animate-fade-in pb-20">
            <div className="flex justify-between items-center mb-6">
              <div>
                 <h2 className="text-2xl font-bold border-l-4 border-subtek-cyan pl-3 flex items-center gap-2">Gestión Comercial y Leads B2B</h2>
                 <p className="text-sm text-slate-400 mt-1 pl-4">Directorio de prospección y seguimiento para Empresas, Consorcios y Acueductos.</p>
              </div>
              <button onClick={agregarCliente} className="flex items-center gap-2 bg-subtek-cyan text-black font-bold px-5 py-2.5 rounded transition-all duration-300 hover:scale-105 shadow-[0_0_15px_rgba(0,240,255,0.5)]"><Plus size={20} /> Nuevo Prospecto</button>
            </div>

            {clientes.length === 0 ? (
              <div className="py-16 text-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl mb-8"><p className="text-lg">Tu embudo de ventas está vacío. Haz clic en "Nuevo Prospecto" para empezar a cazar clientes.</p></div>
            ) : (
              <div className="space-y-6 mb-12">
                {clientes.map((cli) => {
                  
                  // LÓGICA DE SEMÁFORO COMERCIAL B2B
                  let semaforoCliente = 'bg-subtek-card border-slate-700 hover:border-slate-500';
                  let indicadorPunto = 'bg-slate-500';

                  if (cli.estado === 'Cliente activo o con interacción reciente') {
                    semaforoCliente = 'bg-green-950/20 border-green-500/40 hover:border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]';
                    indicadorPunto = 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)]';
                  } else if (cli.estado === 'Cotización enviada' || cli.estado === 'Pendiente respuesta') {
                    semaforoCliente = 'bg-orange-950/20 border-orange-500/40 hover:border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)]';
                    indicadorPunto = 'bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.8)]';
                  } else if (cli.estado === 'Prospecto o contacto inicial') {
                    semaforoCliente = 'bg-subtek-card border-subtek-cyan/40 hover:border-subtek-cyan shadow-[0_0_15px_rgba(0,240,255,0.1)]';
                    indicadorPunto = 'bg-subtek-cyan shadow-[0_0_8px_rgba(0,240,255,0.8)]';
                  } else if (cli.estado === 'Oportunidad detenida o sin respuesta por mas de 2 semanas') {
                    semaforoCliente = 'bg-red-950/10 border-red-500/30 hover:border-red-500/50 opacity-80';
                    indicadorPunto = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]';
                  }

                  return (
                  <div key={cli.id} className={`border rounded-xl p-5 flex flex-col md:flex-row gap-6 relative transition-all duration-300 ${semaforoCliente}`}>
                    
                    <button onClick={() => setModalBorrarCliente(cli.id)} className="absolute top-4 right-4 text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                    
                    {/* Columna Izquierda: Identificación */}
                    <div className="flex-1 space-y-4 border-b md:border-b-0 md:border-r border-slate-700/50 pb-4 md:pb-0 md:pr-6">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-subtek-cyan font-bold uppercase tracking-wider flex items-center gap-1"><Building size={12}/> Empresa / Consorcio</label>
                        <input type="text" placeholder="Ej: Aguas de la Sabana" className="bg-transparent border-b border-slate-600 focus:border-subtek-cyan outline-none w-full text-lg font-bold text-white transition-colors" value={cli.empresa} onChange={(e) => actualizarCliente(cli.id, 'empresa', e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><Users size={12}/> Contacto Principal</label>
                        <input type="text" placeholder="Ej: Ing. Reinaldo Bertrán" className="bg-slate-800 border border-slate-700 rounded p-2 text-sm outline-none focus:border-subtek-cyan text-white w-full" value={cli.nombreContacto} onChange={(e) => actualizarCliente(cli.id, 'nombreContacto', e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><Phone size={12}/> Teléfono</label>
                          <input type="text" placeholder="+57 300..." className="bg-slate-800 border border-slate-700 rounded p-2 text-sm outline-none focus:border-subtek-cyan text-white w-full" value={cli.telefono} onChange={(e) => actualizarCliente(cli.id, 'telefono', e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><Mail size={12}/> Correo</label>
                          <input type="email" placeholder="@empresa.com" className="bg-slate-800 border border-slate-700 rounded p-2 text-sm outline-none focus:border-subtek-cyan text-white w-full" value={cli.correo} onChange={(e) => actualizarCliente(cli.id, 'correo', e.target.value)} />
                        </div>
                      </div>
                    </div>

                    {/* Columna Derecha: Estado y Gestión */}
                    <div className="flex-[1.5] grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Target size={12}/> Estado Comercial
                            <span className={`w-2 h-2 rounded-full ml-2 animate-pulse ${indicadorPunto}`}></span>
                          </label>
                          <select className="bg-slate-800 border border-slate-700 rounded p-2 text-sm outline-none focus:border-subtek-cyan text-white w-full" value={cli.estado} onChange={(e) => actualizarCliente(cli.id, 'estado', e.target.value)}>
                            {ESTADOS_CLIENTE.map(est => <option key={est} value={est}>{est}</option>)}
                          </select>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><LinkIcon size={12}/> Origen del Lead</label>
                          <select className="bg-slate-800 border border-slate-700 rounded p-2 text-sm outline-none focus:border-subtek-cyan text-white w-full" value={cli.origen} onChange={(e) => actualizarCliente(cli.id, 'origen', e.target.value)}>
                            {ORIGEN_CLIENTE.map(or => <option key={or} value={or}>{or}</option>)}
                          </select>
                          
                          {/* CAMPO CONDICIONAL: REFERIDO POR */}
                          {cli.origen === 'Referido' && (
                            <div className="flex flex-col gap-1 mt-2 animate-fade-in">
                              <label className="text-[10px] text-subtek-cyan font-bold uppercase tracking-wider flex items-center gap-1">¿Quién lo refirió?</label>
                              <input type="text" placeholder="Ej: Ing. Carlos (Consorcio X)..." className="bg-slate-900 border border-subtek-cyan/50 rounded p-2 text-sm outline-none focus:border-subtek-cyan text-white w-full shadow-[0_0_10px_rgba(0,240,255,0.1)]" value={cli.referidoPor || ''} onChange={(e) => actualizarCliente(cli.id, 'referidoPor', e.target.value)} />
                            </div>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-3 bg-slate-900/50 p-2 rounded border border-slate-700/50">
                           <input type="checkbox" id={`esCliente_${cli.id}`} checked={cli.esCliente} onChange={(e) => actualizarCliente(cli.id, 'esCliente', e.target.checked)} className="w-5 h-5 accent-subtek-cyan cursor-pointer" />
                           <label htmlFor={`esCliente_${cli.id}`} className={`text-sm font-bold cursor-pointer ${cli.esCliente ? 'text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'text-slate-400'}`}>
                             {cli.esCliente ? '✅ ¡Ya es Cliente Subtek!' : 'Aún no es cliente de pago'}
                           </label>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1 flex-1">
                          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><Info size={12}/> Estado Actual (Notas)</label>
                          <textarea placeholder="Ej: Interesados en robot y posventa..." className="bg-slate-800 border border-slate-700 rounded p-2 text-sm outline-none focus:border-subtek-cyan text-white w-full h-16 resize-none" value={cli.estadoActual} onChange={(e) => actualizarCliente(cli.id, 'estadoActual', e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                          <label className="text-[10px] text-subtek-cyan font-bold uppercase tracking-wider flex items-center gap-1"><TrendingUp size={12}/> Próximo Paso</label>
                          <textarea placeholder="Ej: Agendar llamada técnica..." className="bg-[#1a0f2e] border border-subtek-cyan/40 rounded p-2 text-sm outline-none focus:border-subtek-cyan text-subtek-cyan w-full h-16 resize-none" value={cli.proximoPaso} onChange={(e) => actualizarCliente(cli.id, 'proximoPaso', e.target.value)} />
                        </div>
                      </div>

                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {/* DASHBOARD ANALÍTICO DEL CRM (DIAGRAMA DE TORTA) */}
            {clientes.length > 0 && (
              <div className="bg-[#0a0514] border border-slate-800 rounded-2xl p-8 shadow-2xl flex flex-col md:flex-row items-center justify-around gap-8">
                 <div className="flex flex-col">
                   <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2"><Award className="text-subtek-cyan"/> Tasa de Conversión B2B</h3>
                   <p className="text-slate-400 text-sm max-w-sm">Mide la salud de nuestro embudo. De todos los contactos institucionales que prospectamos, este es el porcentaje que ha comprado tecnología o servicios de Subtek.</p>
                   <div className="mt-6 flex flex-col gap-3">
                      <div className="flex items-center gap-3"><span className="w-4 h-4 rounded bg-subtek-cyan shadow-[0_0_10px_rgba(0,240,255,0.6)]"></span><span className="text-sm font-bold text-white">Clientes Ganados ({clientesConvertidos})</span></div>
                      <div className="flex items-center gap-3"><span className="w-4 h-4 rounded bg-slate-700"></span><span className="text-sm font-bold text-slate-400">Leads en Gestión ({totalClientes - clientesConvertidos})</span></div>
                   </div>
                 </div>

                 {/* Gráfico de Torta en SVG Puro */}
                 <div className="relative w-48 h-48 flex items-center justify-center">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      {/* Fondo (Leads) */}
                      <circle cx="18" cy="18" r="15.91549431" fill="transparent" stroke="#334155" strokeWidth="6" />
                      {/* Porcentaje (Clientes) */}
                      <circle cx="18" cy="18" r="15.91549431" fill="transparent" stroke="#00f0ff" strokeWidth="6" 
                        strokeDasharray={`${porcentajeClientes} ${100 - porcentajeClientes}`} 
                        className="transition-all duration-1000 ease-in-out drop-shadow-[0_0_5px_rgba(0,240,255,0.8)]"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-white">{porcentajeClientes}%</span>
                      <span className="text-[10px] font-bold text-subtek-cyan uppercase tracking-widest">Conversión</span>
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================= */}
        {/* ROADMAP ECOSISTEMA B2B (TOP-DOWN WATERFALL) */}
        {/* ========================================= */}
        {gerenciaActiva === 'Roadmap Ecosistema' && (
          <div className="mb-16 animate-fade-in flex flex-col items-center">
            
            <div className="w-full mb-10 text-center">
               <h2 className="text-4xl font-black text-white mb-3">Roadmap Tecnológico <span className="text-subtek-cyan drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">SUBTEK</span></h2>
               <p className="text-slate-400 text-base max-w-3xl mx-auto">Nuestro pipeline estratégico: El flujo inicia capturando datos en campo, se procesa en nuestro ecosistema digital B2B y culmina en la inteligencia artificial predictiva. Haz clic para activar cada módulo productivo.</p>
            </div>

            <div className="flex flex-col items-center w-full max-w-5xl bg-[#0a0514] border border-slate-800 p-10 md:p-14 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-subtek-cyan/5 rounded-full blur-[120px] pointer-events-none"></div>

               <div className="flex flex-col items-center w-full z-10">
                  <div className="bg-subtek-cyan text-black text-sm font-black px-8 py-2 rounded-full uppercase tracking-widest mb-8 shadow-[0_0_20px_rgba(0,240,255,0.6)] flex items-center gap-2 border-2 border-white/20">
                     Fase 1: Base Operativa y Captura de Datos
                  </div>
                  <div className="flex flex-wrap justify-center gap-6 w-full">
                     <RoadmapCard id="fase1_cctv" title="Venta de Equipos CCTV" subtitle="Representación Comercial" icon={Camera} state={roadmap.fase1_cctv} />
                     <RoadmapCard id="fase1_vactor" title="Limpieza Vactor" subtitle="Intermediación Logística" icon={Droplets} state={roadmap.fase1_vactor} />
                     <RoadmapCard id="fase1_inspeccion" title="Inspección CCTV" subtitle="Certificación NASSCO" icon={Video} state={roadmap.fase1_inspeccion} />
                  </div>
               </div>

               <div className="flex flex-col items-center my-4 z-10 opacity-70">
                  <div className="w-1 h-12 bg-gradient-to-b from-subtek-cyan to-blue-500 rounded-full"></div>
                  <ArrowDown size={24} className="text-blue-500 -mt-2 animate-bounce" />
               </div>

               <div className="flex flex-col items-center w-full z-10">
                  <div className="bg-blue-900/40 text-blue-400 text-sm font-bold px-8 py-2 rounded-full uppercase tracking-widest mb-8 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center gap-2">
                     Fase 2: Ecosistema Digital B2B
                  </div>
                  <div className="flex flex-wrap justify-center gap-6 w-full">
                     <RoadmapCard id="fase2_saas" title="Subtek Core OS™" subtitle="Plataforma SaaS Unificada" icon={Cloud} state={roadmap.fase2_saas} />
                     <RoadmapCard id="fase2_etiquetador" title="Subtek Tag Studio™" subtitle="Etiquetador NASSCO" icon={Tag} state={roadmap.fase2_etiquetador} />
                     <RoadmapCard id="fase2_vision" title="AutoScan AI™" subtitle="Visión Computacional" icon={Eye} state={roadmap.fase2_vision} />
                     <RoadmapCard id="fase2_recomendaciones" title="Prescripta™" subtitle="Modelo de Recomendaciones" icon={Cpu} state={roadmap.fase2_recomendaciones} />
                  </div>
               </div>

               <div className="flex flex-col items-center my-4 z-10 opacity-50">
                  <div className="w-1 h-12 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                  <ArrowDown size={24} className="text-purple-500 -mt-2 animate-bounce" />
               </div>

               <div className="flex flex-col items-center w-full z-10">
                  <div className="bg-purple-900/30 text-purple-400 text-sm font-bold px-8 py-2 rounded-full uppercase tracking-widest mb-8 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)] flex items-center gap-2">
                     Fase 3: Inteligencia Artificial Predictiva
                  </div>
                  <div className="flex flex-wrap justify-center gap-6 w-full md:w-4/5">
                     <RoadmapCard id="fase3_predictivo" title="Predictivo de Vida" subtitle="Deterioro de Tuberías" icon={TrendingUp} state={roadmap.fase3_predictivo} />
                     <RoadmapCard id="fase3_vision_rt" title="Visión IA en Tiempo Real" subtitle="Inferencia en Streaming" icon={Zap} state={roadmap.fase3_vision_rt} />
                     <RoadmapCard id="fase3_macp" title="Modelos de Inversión MACP" subtitle="Priorización de Capital" icon={PieChart} state={roadmap.fase3_macp} />
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* WORKSPACE HEADER (Oculto en Roadmap y Clientes) */}
        {(gerenciaActiva !== 'Roadmap Ecosistema' && gerenciaActiva !== 'Clientes Subtek') && (
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold border-l-4 border-subtek-cyan pl-3">
              {gerenciaActiva === 'Dashboard Global' ? 'Visión 360° y Flujo de Caja' : `Workspace: ${gerenciaActiva}`}
            </h2>
            {gerenciaActiva !== 'Dashboard Global' && (
              <button onClick={agregarHipotesis} className="flex items-center gap-2 bg-subtek-cyan text-black font-bold px-4 py-2 rounded transition-all duration-300 hover:scale-105 hover:shadow-[0_0_15px_rgba(0,240,255,0.5)]"><Plus size={20} /> Nuevo Proyecto</button>
            )}
          </div>
        )}

        {/* VISTA DASHBOARD GLOBAL CON EDICIÓN DE PRESUPUESTO */}
        {gerenciaActiva === 'Dashboard Global' && (
          <>
            <div className="mb-8 bg-subtek-card p-5 rounded-xl border border-subtek-cyan/50 flex flex-col items-start shadow-[0_0_15px_rgba(0,240,255,0.1)]">
              <span className="text-slate-400 text-xs font-bold mb-4 uppercase tracking-widest flex items-center gap-2"><Info size={14}/> Configuración Financiera Global</span>
              <div className="flex flex-wrap items-end gap-4 w-full">
                  <div className="flex flex-col gap-1 w-full md:w-auto">
                    <label className="text-xs text-subtek-cyan font-bold uppercase">Mes Operativo</label>
                    <select className="bg-slate-800 border border-slate-700 rounded p-2 text-white outline-none focus:border-subtek-cyan h-[42px]" value={mesPpto} onChange={(e) => { setMesPpto(e.target.value); setHayCambiosLocales(true); }}>
                      {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 w-full md:w-auto">
                    <label className="text-xs text-subtek-cyan font-bold uppercase">Año</label>
                    <input type="number" className="bg-slate-800 border border-slate-700 rounded p-2 text-white outline-none focus:border-subtek-cyan w-24 h-[42px]" value={anioPpto} onChange={(e) => { setAnioPpto(Number(e.target.value)); setHayCambiosLocales(true); }} />
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                    <label className="text-xs text-subtek-cyan font-bold uppercase">Fondo Total Disponible (Subtek) ($)</label>
                    <input type="number" placeholder="Ej: 50000" className="bg-slate-800 border border-slate-700 rounded p-2 outline-none focus:border-subtek-cyan text-white text-lg font-bold w-full h-[42px]" value={presupuestoTotalSubtek || ''} onChange={(e) => guardarPresupuestoTotal(Number(e.target.value))} />
                  </div>
                  <button onClick={congelarPresupuestoMensual} className="bg-subtek-cyan text-black font-black px-6 py-2 rounded h-[42px] hover:scale-105 transition-all shadow-[0_0_10px_rgba(0,240,255,0.3)] whitespace-nowrap">
                    Congelar Ppto
                  </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-3">* Al congelar el presupuesto, fijas este valor como la meta financiera del periodo. Recuerda subir los cambios a la nube con el botón superior.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-subtek-card p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center shadow-lg col-span-2 md:col-span-4 bg-gradient-to-r from-subtek-blue to-[#1a0f2e]">
                <span className="text-subtek-cyan text-sm font-bold mb-1 uppercase tracking-widest">Fondo Total Disponible ({mesPpto} {anioPpto})</span>
                <div className="flex items-center justify-center gap-2">
                   <span className="text-4xl font-black text-white">$</span>
                   <input type="number" className="bg-transparent text-4xl font-black text-white outline-none text-center border-b border-slate-600 w-64 transition-colors cursor-not-allowed opacity-90" value={presupuestoTotalSubtek || ''} disabled={true} />
                </div>
              </div>
              <div className="bg-subtek-card p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center shadow-lg"><span className="text-slate-400 text-sm font-bold mb-1">P. Reservado (Activas)</span><span className="text-2xl font-black text-blue-400">${activasAsignado.toLocaleString()}</span></div>
              <div className="bg-subtek-card p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center shadow-lg"><span className="text-slate-400 text-sm font-bold mb-1">P. Quemado (Finalizadas)</span><span className="text-2xl font-black text-red-400">${finalizadasGastado.toLocaleString()}</span></div>
              <div className="bg-subtek-card p-4 rounded-xl border border-subtek-cyan/50 flex flex-col items-center justify-center text-center shadow-[0_0_15px_rgba(0,240,255,0.2)]"><span className="text-subtek-cyan text-sm font-bold mb-1">Caja Estimada Restante</span><span className={`text-3xl font-black ${presupuestoDisponible < 0 ? 'text-red-500' : 'text-green-400'}`}>${presupuestoDisponible.toLocaleString()}</span></div>
              <div className="bg-subtek-card p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center shadow-lg"><span className="text-slate-400 text-sm font-bold mb-1">Proyectos / Validados</span><span className="text-2xl font-black text-white">{hipotesis.length} / <span className="text-green-400">{validadas}</span></span></div>
            </div>
          </>
        )}

        {/* GRID DE TARJETAS DE PROYECTO (SE OCULTA EN ROADMAP Y CLIENTES) */}
        {(gerenciaActiva !== 'Roadmap Ecosistema' && gerenciaActiva !== 'Clientes Subtek') && (
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
        )}
      </main>
    </div>
  );
}
