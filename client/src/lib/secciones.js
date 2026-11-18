export const SECCIONES = [
  { id: 'resumen', label: 'Resumen ejecutivo', icon: 'dashboard' },
  { id: 'glosario', label: 'Guía Analytics', icon: 'menu_book' },
  { id: 'estado', label: 'Estado de la cuenta', icon: 'account_circle' },
  { id: 'destacadas', label: 'Contenido destacado', icon: 'photo_library' },
  { id: 'demografia', label: 'Demografía', icon: 'groups' },
  { id: 'ubicacion', label: 'Ubicación', icon: 'place' },
  { id: 'interacciones', label: 'Interacciones', icon: 'favorite' },
  { id: 'publicaciones', label: 'Publicaciones', icon: 'article' },
  { id: 'atraccion-engagement', label: 'Atracción y Engagement', icon: 'trending_up' },
  { id: 'reels', label: 'Reels', icon: 'movie' },
  { id: 'historias', label: 'Historias', icon: 'history_toggle_off' },
  { id: 'competencia', label: 'Competencia', icon: 'leaderboard' },
  { id: 'comunicaciones', label: 'Comunicaciones internas', icon: 'campaign' },
  { id: 'conclusiones', label: 'Conclusiones', icon: 'fact_check' },
];

export function seccionesDeMarca(habilitadas) {
  if (!habilitadas?.length) return SECCIONES.filter((s) => !['competencia', 'comunicaciones'].includes(s.id));
  const set = new Set(habilitadas);
  return SECCIONES.filter((s) => set.has(s.id));
}
