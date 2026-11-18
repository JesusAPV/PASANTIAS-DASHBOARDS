import { prisma, Granularidad, RedSocial, TipoPublicacion } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { MESES } from '../ingesta/parser.js';
const dec = (v) => (v === null || v === undefined ? null : Number(v));
const periodoKey = (d) => d.toISOString().slice(0, 7); // YYYY-MM
const periodoLabel = (d) => `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
export async function marcaOrThrow(marcaId) {
  const marca = await prisma.marca.findFirst({ where: { id: marcaId, deletedAt: null }, include: { cliente: true } });
  if (!marca) throw notFound('La marca no existe.');
  return marca;
}
function serie(rows, campo) {
  return rows.map((r) => dec(r[campo]));
}
/** Estado completo del dashboard de una marca para un período (YYYY-MM). */
export async function obtenerDashboard(marcaId, periodoSolicitado) {
  const marca = await marcaOrThrow(marcaId);
  const cuenta = await prisma.cuenta.findUnique({ where: { marcaId_network: { marcaId, network: RedSocial.INSTAGRAM } } });
  const historico = cuenta
    ? await prisma.metricaCuenta.findMany({ where: { cuentaId: cuenta.id, granularidad: Granularidad.MENSUAL, deletedAt: null }, orderBy: { periodo: 'asc' } })
    : [];
  const periodos = historico.map((m) => ({ key: periodoKey(m.periodo), label: periodoLabel(m.periodo) }));
  const actual = (periodoSolicitado && historico.find((m) => periodoKey(m.periodo) === periodoSolicitado)) || historico.at(-1) || null;
  const idx = actual ? historico.indexOf(actual) : -1;
  const ultimos3 = idx >= 0 ? historico.slice(Math.max(0, idx - 2), idx + 1) : [];
  const anterior = idx > 0 ? historico[idx - 1] : null;
  const periodo = actual?.periodo ?? null;
  const [demografia, competidores, publicaciones, ubicaciones, notas, textos, comunicaciones, contenidos] = await Promise.all([
    cuenta && periodo ? prisma.demografiaCuenta.findMany({ where: { cuentaId: cuenta.id, periodo } }) : [],
    periodo
      ? prisma.competidor.findMany({ where: { marcaId, deletedAt: null }, include: { metricas: { where: { periodo } } }, orderBy: { nombre: 'asc' } })
      : [],
    periodo
      ? prisma.publicacion.findMany({
          where: { marcaId, deletedAt: null, fechaPublicacion: periodo },
          include: { metricas: { where: { periodo } } },
          orderBy: { metricoolId: 'asc' },
        })
      : [],
    prisma.ubicacion.findMany({ where: { marcaId }, orderBy: [{ tipo: 'asc' }, { orden: 'asc' }, { porcentaje: 'desc' }] }),
    prisma.nota.findMany({ where: { marcaId } }),
    prisma.textoEditorial.findMany({ where: { marcaId } }),
    prisma.comunicacion.findMany({ where: { marcaId, deletedAt: null }, orderBy: [{ orden: 'asc' }, { createdAt: 'asc' }] }),
    prisma.contenidoManual.findMany({ where: { marcaId, deletedAt: null }, orderBy: { fecha: 'desc' } }),
  ]);
  const competencia = (campo) =>
    competidores.map((c) => ({ nombre: c.nombre, esPropia: c.esPropia, valor: dec(c.metricas[0]?.[campo]) })).filter((c) => c.valor !== null);
  return {
    marca: {
      id: marca.id,
      clave: marca.clave,
      nombre: marca.nombre,
      logoUrl: marca.logoUrl,
      tema: marca.tema,
      secciones: marca.secciones,
      metaSeguidores: marca.metaSeguidores,
      cliente: { id: marca.cliente.id, clave: marca.cliente.clave, nombre: marca.cliente.nombre },
    },
    periodo: actual
      ? {
          key: periodoKey(actual.periodo),
          label: periodoLabel(actual.periodo),
          mes: MESES[actual.periodo.getUTCMonth()],
          anio: actual.periodo.getUTCFullYear(),
        }
      : null,
    periodos,
    cuenta: actual
      ? {
          seguidores: actual.seguidores,
          variacion: actual.variacionSeguidores,
          meta: marca.metaSeguidores,
          publicaciones: actual.publicacionesCount,
          engagement: dec(actual.engagement),
          seguidoresAnterior: anterior?.seguidores ?? null,
        }
      : null,
    series: {
      labels: ultimos3.map((m) => MESES[m.periodo.getUTCMonth()]),
      seguidores: serie(ultimos3, 'seguidores'),
      meGusta: serie(ultimos3, 'meGusta'),
      comentarios: serie(ultimos3, 'comentarios'),
      compartidos: serie(ultimos3, 'compartidos'),
      guardados: serie(ultimos3, 'guardados'),
      reposteos: serie(ultimos3, 'reposteos'),
      alcancePosts: serie(ultimos3, 'alcancePosts'),
      impresionesPosts: serie(ultimos3, 'impresionesPosts'),
      visitasPerfil: serie(ultimos3, 'visitasPerfil'),
      engagement: serie(ultimos3, 'engagement'),
      alcanceReels: serie(ultimos3, 'alcanceReels'),
      reproduccionesReels: serie(ultimos3, 'reproduccionesReels'),
      impresionesHistorias: serie(ultimos3, 'impresionesHistorias'),
      alcanceHistorias: serie(ultimos3, 'alcanceHistorias'),
      historiasCount: serie(ultimos3, 'historiasCount'),
    },
    historico: historico.map((m) => ({
      periodo: periodoKey(m.periodo),
      mes: MESES[m.periodo.getUTCMonth()],
      seguidores: m.seguidores,
      variacion: m.variacionSeguidores,
      meGusta: m.meGusta,
      comentarios: m.comentarios,
      engagement: dec(m.engagement),
      alcancePosts: m.alcancePosts,
      publicaciones: m.publicacionesCount,
    })),
    demografia: {
      sexo: demografia.filter((d) => d.categoria === 'SEXO').map((d) => ({ segmento: d.segmento, porcentaje: Number(d.porcentaje) })),
      edad: demografia.filter((d) => d.categoria === 'EDAD').map((d) => ({ segmento: d.segmento, porcentaje: Number(d.porcentaje) })),
    },
    competencia: {
      seguidores: competencia('seguidores'),
      publicaciones: competencia('publicaciones'),
      meGusta: competencia('meGusta'),
      comentarios: competencia('comentarios'),
      engagement: competencia('engagement'),
    },
    publicaciones: publicaciones
      .filter((p) => p.tipo !== TipoPublicacion.STORY)
      .map((p) => ({ id: p.id, ref: p.metricoolId, tipo: p.tipo, metricas: p.metricasAcumuladas })),
    historias: publicaciones.filter((p) => p.tipo === TipoPublicacion.STORY).map((p) => ({ id: p.id, ref: p.metricoolId, metricas: p.metricasAcumuladas })),
    editorial: {
      ubicaciones: {
        paises: ubicaciones.filter((u) => u.tipo === 'PAIS').map((u) => ({ id: u.id, nombre: u.nombre, porcentaje: Number(u.porcentaje) })),
        ciudades: ubicaciones.filter((u) => u.tipo === 'CIUDAD').map((u) => ({ id: u.id, nombre: u.nombre, porcentaje: Number(u.porcentaje) })),
      },
      notas: Object.fromEntries(notas.map((n) => [n.clave, n.texto])),
      textos: Object.fromEntries(textos.map((t) => [t.clave.toLowerCase(), t.texto])),
      comunicaciones: comunicaciones.map((c) => ({ id: c.id, tema: c.tema, formato: c.formato, periodo: c.periodo?.toISOString().slice(0, 10) ?? null })),
      contenidos: contenidos.map((c) => ({ id: c.id, tipo: c.tipo, fecha: c.fecha.toISOString().slice(0, 10), imagenUrl: c.imagenUrl, metricas: c.metricas })),
    },
    revision: await obtenerRevision(marcaId),
  };
}
/** Marca de tiempo del último cambio relevante (para sincronizar pestañas). */
export async function obtenerRevision(marcaId) {
  const [u, n, t, c, m, carga] = await Promise.all([
    prisma.ubicacion.aggregate({ where: { marcaId }, _max: { updatedAt: true } }),
    prisma.nota.aggregate({ where: { marcaId }, _max: { updatedAt: true } }),
    prisma.textoEditorial.aggregate({ where: { marcaId }, _max: { updatedAt: true } }),
    prisma.comunicacion.aggregate({ where: { marcaId }, _max: { updatedAt: true } }),
    prisma.contenidoManual.aggregate({ where: { marcaId }, _max: { updatedAt: true } }),
    prisma.cargaArchivo.aggregate({ where: { marcaId, estado: 'COMPLETADA' }, _max: { finalizadoEn: true } }),
  ]);
  const fechas = [u._max.updatedAt, n._max.updatedAt, t._max.updatedAt, c._max.updatedAt, m._max.updatedAt, carga._max.finalizadoEn].filter((d) => Boolean(d));
  return fechas.length ? new Date(Math.max(...fechas.map((d) => d.getTime()))).toISOString() : '';
}
