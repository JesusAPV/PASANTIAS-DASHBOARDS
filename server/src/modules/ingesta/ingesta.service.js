import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../config.js';
import { prisma, EstadoCarga, FormatoArchivo, RedSocial, TipoPublicacion, Granularidad } from '../../lib/prisma.js';
import { HttpError, notFound, unprocessable } from '../../lib/errors.js';
import { sheetsFromCsvFiles, sheetsFromXlsx } from './loaders.js';
import { MESES, ParseError, parseReport } from './parser.js';
const periodoDate = (anio, mes) => new Date(Date.UTC(anio, mes - 1, 1));
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
function cargarHojas(files) {
  const xlsx = files.filter((f) => /\.xlsx?$/i.test(f.originalname));
  const csv = files.filter((f) => /\.csv$/i.test(f.originalname));
  if (xlsx.length === 1 && !csv.length) return { formato: FormatoArchivo.XLSX, sheets: sheetsFromXlsx(xlsx[0].buffer) };
  if (csv.length && !xlsx.length) return { formato: FormatoArchivo.CSV, sheets: sheetsFromCsvFiles(csv) };
  throw unprocessable('Sube un único archivo .xlsx o un conjunto de archivos .csv (uno por hoja).');
}
/**
 * Procesa un libro mensual y lo persiste de forma atómica. Si algo falla,
 * no se escribe ninguna métrica y la carga queda registrada como RECHAZADA.
 */
export async function procesarCarga(params) {
  const started = performance.now();
  const marca = await prisma.marca.findFirst({ where: { id: params.marcaId, deletedAt: null } });
  if (!marca) throw notFound('La marca no existe.');
  const principal = params.files[0];
  const hash = crypto.createHash('sha256');
  for (const f of params.files) hash.update(f.buffer);
  const tamano = params.files.reduce((acc, f) => acc + f.size, 0);
  const nombreArchivo = params.files.length === 1 ? principal.originalname : `${params.files.length} archivos CSV`;
  const carga = await prisma.cargaArchivo.create({
    data: {
      marcaId: marca.id,
      usuarioId: params.usuarioId ?? null,
      nombreArchivo,
      formato: /\.csv$/i.test(principal.originalname) ? FormatoArchivo.CSV : FormatoArchivo.XLSX,
      tamanoBytes: tamano,
      hashSha256: hash.digest('hex'),
    },
  });
  const rechazar = async (mensaje, issues = []) => {
    await prisma.cargaArchivo.update({
      where: { id: carga.id },
      data: { estado: EstadoCarga.RECHAZADA, errores: [mensaje, ...issues], duracionMs: Math.round(performance.now() - started), finalizadoEn: new Date() },
    });
    throw unprocessable(mensaje, issues);
  };
  let report;
  let formato;
  try {
    const loaded = cargarHojas(params.files);
    formato = loaded.formato;
    report = parseReport(loaded.sheets);
  } catch (error) {
    if (error instanceof ParseError) return rechazar(error.message, error.issues);
    if (error instanceof HttpError) return rechazar(error.message);
    throw error;
  }
  const periodo = periodoDate(params.anio, report.mesActual);
  let filas = 0;
  const resumen = { meses: 0, demografia: 0, competidores: 0, metricasCompetidor: 0, publicaciones: 0, historias: 0 };
  await prisma.$transaction(async (tx) => {
    const cuenta = await tx.cuenta.upsert({
      where: { marcaId_network: { marcaId: marca.id, network: RedSocial.INSTAGRAM } },
      update: {},
      create: { marcaId: marca.id, network: RedSocial.INSTAGRAM },
    });
    for (const m of report.meses) {
      const { mes, ...valores } = m;
      const data = clean({ ...valores, engagement: valores.engagement });
      await tx.metricaCuenta.upsert({
        where: { cuentaId_periodo_granularidad: { cuentaId: cuenta.id, periodo: periodoDate(params.anio, mes), granularidad: Granularidad.MENSUAL } },
        update: { ...data, deletedAt: null },
        create: { cuentaId: cuenta.id, periodo: periodoDate(params.anio, mes), granularidad: Granularidad.MENSUAL, ...data },
      });
      filas += 1;
      resumen.meses += 1;
    }
    for (const d of report.demografia) {
      await tx.demografiaCuenta.upsert({
        where: { cuentaId_periodo_categoria_segmento: { cuentaId: cuenta.id, periodo, categoria: d.categoria, segmento: d.segmento } },
        update: { porcentaje: d.porcentaje },
        create: { cuentaId: cuenta.id, periodo, categoria: d.categoria, segmento: d.segmento, porcentaje: d.porcentaje },
      });
      filas += 1;
      resumen.demografia += 1;
    }
    const aliases = marca.aliases.map((a) => a.toLowerCase());
    for (const c of report.competidores) {
      const esPropia = aliases.some((a) =>
        c.nombre
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .includes(a),
      );
      const competidor = await tx.competidor.upsert({
        where: { marcaId_network_nombre: { marcaId: marca.id, network: RedSocial.INSTAGRAM, nombre: c.nombre } },
        update: { esPropia, deletedAt: null },
        create: { marcaId: marca.id, network: RedSocial.INSTAGRAM, nombre: c.nombre, esPropia },
      });
      resumen.competidores += 1;
      for (const m of c.meses) {
        const { mes, ...valores } = m;
        await tx.metricaCompetidor.upsert({
          where: { competidorId_periodo: { competidorId: competidor.id, periodo: periodoDate(params.anio, mes) } },
          update: clean(valores),
          create: { competidorId: competidor.id, periodo: periodoDate(params.anio, mes), ...clean(valores) },
        });
        filas += 1;
        resumen.metricasCompetidor += 1;
      }
    }
    for (const p of report.publicaciones) {
      const metricoolId = `${params.anio}-${String(report.mesActual).padStart(2, '0')}-post-${p.indice}`;
      const metricas = clean({
        meGusta: p.meGusta,
        comentarios: p.comentarios,
        compartidos: p.compartidos,
        guardados: p.guardados,
        reposteos: p.reposteos,
        alcance: p.alcance,
        reproducciones: p.reproducciones,
        visitasPerfil: p.visitasPerfil,
        interacciones: p.interacciones,
        engagement: p.engagement,
      });
      const pub = await tx.publicacion.upsert({
        where: { marcaId_network_metricoolId: { marcaId: marca.id, network: RedSocial.INSTAGRAM, metricoolId } },
        update: { tipo: p.tipo, metricasAcumuladas: metricas, deletedAt: null },
        create: { marcaId: marca.id, network: RedSocial.INSTAGRAM, metricoolId, tipo: p.tipo, fechaPublicacion: periodo, metricasAcumuladas: metricas },
      });
      await tx.metricaPublicacion.upsert({
        where: { publicacionId_periodo: { publicacionId: pub.id, periodo } },
        update: clean({
          meGusta: p.meGusta,
          comentarios: p.comentarios,
          compartidos: p.compartidos,
          guardados: p.guardados,
          alcance: p.alcance,
          reproducciones: p.reproducciones,
          extra: { reposteos: p.reposteos, visitasPerfil: p.visitasPerfil, interacciones: p.interacciones, engagement: p.engagement },
        }),
        create: {
          publicacionId: pub.id,
          periodo,
          ...clean({
            meGusta: p.meGusta,
            comentarios: p.comentarios,
            compartidos: p.compartidos,
            guardados: p.guardados,
            alcance: p.alcance,
            reproducciones: p.reproducciones,
          }),
          extra: clean({ reposteos: p.reposteos, visitasPerfil: p.visitasPerfil, interacciones: p.interacciones, engagement: p.engagement }),
        },
      });
      filas += 1;
      resumen.publicaciones += 1;
    }
    for (const h of report.historias) {
      const metricoolId = `${params.anio}-${String(report.mesActual).padStart(2, '0')}-story-${h.indice}`;
      const pub = await tx.publicacion.upsert({
        where: { marcaId_network_metricoolId: { marcaId: marca.id, network: RedSocial.INSTAGRAM, metricoolId } },
        update: { metricasAcumuladas: clean({ impresiones: h.impresiones, alcance: h.alcance }), deletedAt: null },
        create: {
          marcaId: marca.id,
          network: RedSocial.INSTAGRAM,
          metricoolId,
          tipo: TipoPublicacion.STORY,
          fechaPublicacion: periodo,
          metricasAcumuladas: clean({ impresiones: h.impresiones, alcance: h.alcance }),
        },
      });
      await tx.metricaPublicacion.upsert({
        where: { publicacionId_periodo: { publicacionId: pub.id, periodo } },
        update: clean({ impresiones: h.impresiones, alcance: h.alcance }),
        create: { publicacionId: pub.id, periodo, ...clean({ impresiones: h.impresiones, alcance: h.alcance }) },
      });
      filas += 1;
      resumen.historias += 1;
    }
    if (report.metaSeguidores && report.metaSeguidores !== marca.metaSeguidores) {
      await tx.marca.update({ where: { id: marca.id }, data: { metaSeguidores: Math.round(report.metaSeguidores) } });
    }
  });
  // Conservar el archivo original para trazabilidad.
  const dir = path.join(config.reportsDir, marca.clave);
  await fs.mkdir(dir, { recursive: true });
  const stamp = `${params.anio}-${String(report.mesActual).padStart(2, '0')}_${carga.id.slice(0, 8)}`;
  let ruta;
  if (params.files.length === 1) {
    ruta = path.join(dir, `${stamp}${path.extname(principal.originalname).toLowerCase()}`);
    await fs.writeFile(ruta, principal.buffer);
  } else {
    ruta = path.join(dir, stamp);
    await fs.mkdir(ruta, { recursive: true });
    for (const f of params.files) await fs.writeFile(path.join(ruta, path.basename(f.originalname)), f.buffer);
  }
  const duracionMs = Math.round(performance.now() - started);
  await prisma.cargaArchivo.update({
    where: { id: carga.id },
    data: {
      estado: EstadoCarga.COMPLETADA,
      formato,
      periodo,
      filasLeidas: filas,
      filasInsertadas: filas,
      errores: report.advertencias.length ? report.advertencias : undefined,
      duracionMs,
      rutaAlmacenada: path.relative(config.reportsDir, ruta),
      finalizadoEn: new Date(),
    },
  });
  return {
    cargaId: carga.id,
    periodo: periodo.toISOString().slice(0, 10),
    mesActual: MESES[report.mesActual - 1],
    filasInsertadas: filas,
    duracionMs,
    advertencias: report.advertencias,
    resumen,
  };
}
export function listarCargas(marcaId) {
  return prisma.cargaArchivo.findMany({
    where: { marcaId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { usuario: { select: { username: true, nombre: true } } },
  });
}
