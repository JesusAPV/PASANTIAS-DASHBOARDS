/**
 * Recorre la API como Gerente e imprime un resumen por marca para contrastar
 * con los dashboards PHP de referencia.
 * Uso: pnpm exec tsx scripts/verificar-api.ts [http://localhost:3000]
 */
const BASE = process.argv[2] ?? 'http://localhost:3000';
async function api(path, init = {}, token) {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${JSON.stringify(body)}`);
  return body;
}
const login = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username: 'gerente', password: 'Gerente12345!' }) });
const token = login.token;
const { marcas } = await api('/marcas', {}, token);
for (const marca of marcas) {
  const d = await api(`/dashboard/${marca.id}`, {}, token);
  const c = d.cuenta ?? {};
  const e = d.editorial;
  console.log(
    `${marca.nombre.padEnd(17)} ${String(d.periodo?.label ?? '-').padEnd(12)} seg=${String(c.seguidores).padStart(6)} var=${String(c.variacion).padStart(5)} meta=${c.meta} posts=${c.publicaciones} eng=${c.engagement}` +
      ` | likes ${JSON.stringify(d.series.meGusta)} | hist=${d.historias.length} pubs=${d.publicaciones.length} comp=${d.competencia.seguidores.length}` +
      ` | notas=${Object.keys(e.notas).length} contenidos=${e.contenidos.length} comms=${e.comunicaciones.length} paises=${e.ubicaciones.paises.length}`,
  );
}
export {};
