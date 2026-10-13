export const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const DEFAULT_ROADMAP = {
  fase1_cctv: true, fase1_vactor: true, fase1_inspeccion: true,
  fase2_saas: false, fase2_etiquetador: false, fase2_recomendaciones: false, fase2_vision: false,
  fase3_predictivo: false, fase3_vision_rt: false, fase3_macp: false,
};
export type Roadmap = typeof DEFAULT_ROADMAP;
export type Config = { roadmap: Roadmap; total: number; mes: string; anio: number };
export type CloudConfig = Config & { id: number; revision: number; updated_at: string };
export const LEGACY_KEYS = ['subtek-data-v6','subtek-clientes-v6','subtek-ppto-v6','subtek-ppto-mes-v6','subtek-ppto-anio-v6','subtek-roadmap-v6'];
export const BACKUP_KEY = 'subtek-transition-v7-original';
export function validateConfig(value: unknown): Config {
  const c = value as Config;
  if (!c || typeof c !== 'object' || !c.roadmap || typeof c.roadmap !== 'object' || Array.isArray(c.roadmap) ||
      Object.keys(c.roadmap).length !== Object.keys(DEFAULT_ROADMAP).length ||
      Object.keys(DEFAULT_ROADMAP).some(k => typeof c.roadmap[k as keyof Roadmap] !== 'boolean') ||
      typeof c.total !== 'number' || !Number.isFinite(c.total) || c.total < 0 ||
      !MONTHS.includes(c.mes) || !Number.isInteger(c.anio) || c.anio < 2000 || c.anio > 2100) {
    throw new Error('Configuración inválida: revisar roadmap, total, mes y año (2000–2100).');
  }
  return { roadmap: { ...c.roadmap }, total: c.total, mes: c.mes, anio: c.anio };
}
export function equalConfig(a: Config, b: Config) {
  return a.total === b.total && a.mes === b.mes && a.anio === b.anio &&
    Object.keys(DEFAULT_ROADMAP).every(k => a.roadmap[k as keyof Roadmap] === b.roadmap[k as keyof Roadmap]);
}
export function snapshotLegacy(storage: Storage) {
  const raw = Object.fromEntries(LEGACY_KEYS.map(k => [k, storage.getItem(k)]));
  // Nunca sustituir la copia original por defaults ni por datos descargados.
  if (!storage.getItem(BACKUP_KEY)) storage.setItem(BACKUP_KEY, JSON.stringify({ at: new Date().toISOString(), raw }));
  return raw;
}
export function legacyConfig(raw: Record<string, string | null>): Config {
  return validateConfig({
    roadmap: raw['subtek-roadmap-v6'] === null ? { ...DEFAULT_ROADMAP } : JSON.parse(raw['subtek-roadmap-v6']!),
    total: raw['subtek-ppto-v6'] === null ? 0 : Number(raw['subtek-ppto-v6']),
    mes: raw['subtek-ppto-mes-v6'] ?? 'Septiembre',
    anio: raw['subtek-ppto-anio-v6'] === null ? 2026 : Number(raw['subtek-ppto-anio-v6']),
  });
}
export function downloadJSON(value: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
