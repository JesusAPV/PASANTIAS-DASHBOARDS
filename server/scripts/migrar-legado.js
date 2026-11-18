/**
 * Migra los datos de los tres proyectos PHP (MIMESA-local, MONTALBAN-local,
 * SHERWIN) a PostgreSQL: libros Excel, ubicaciones, notas, conclusiones,
 * publicaciones/historias destacadas con sus imágenes y comunicaciones.
 *
 * Uso: pnpm exec tsx scripts/migrar-legado.ts [rutaRaizLegado] [anio]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../src/config.js';
import { prisma, ClaveTextoEditorial, TipoContenidoManual, TipoUbicacion } from '../src/lib/prisma.js';
import { procesarCarga } from '../src/modules/ingesta/ingesta.service.js';
import { guardarImagen } from '../src/modules/dashboard/editorial.service.js';
const RAIZ = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, '../../..'));
const ANIO = Number(process.argv[3] ?? 2026);
const leerJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const montalbanJson = path.join(RAIZ, 'MONTALBAN-local/MONTALBAN-local/montalban_private/dashboard.json');
const montalbanState = fs.existsSync(montalbanJson) ? leerJson(montalbanJson) : {};
const FUENTES = [
  ...['papelon', 'gella', 'dulfit'].map((m) => ({
    marca: m,
    excel: path.join(RAIZ, `MONTALBAN-local/MONTALBAN-local/montalban_private/${m}.xlsx`),
    frontend: path.join(RAIZ, 'MONTALBAN-local/MONTALBAN-local/frontend'),
    estado: () => montalbanState[m],
  })),
  {
    marca: 'mimesa',
    excel: path.join(RAIZ, 'MIMESA-local/MIMESA-local/mimesa_private/mimesa.xlsx'),
    frontend: path.join(RAIZ, 'MIMESA-local/MIMESA-local/frontend'),
    estado: () => {
      const p = path.join(RAIZ, 'MIMESA-local/MIMESA-local/mimesa_private/dashboard.json');
      return fs.existsSync(p) ? leerJson(p) : undefined;
    },
  },
  {
    marca: 'sherwin-williams',
    excel: path.join(RAIZ, 'SHERWIN/SHERWIN/sherwin_private/sherwin.xlsx'),
    frontend: path.join(RAIZ, 'SHERWIN/SHERWIN/frontend'),
    estado: () => {
      const p = path.join(RAIZ, 'SHERWIN/SHERWIN/sherwin_private/dashboard.json');
      return fs.existsSync(p) ? leerJson(p) : undefined;
    },
  },
];
async function migrarMarca(fuente, adminId) {
  const marca = await prisma.marca.findUnique({ where: { clave: fuente.marca } });
  if (!marca) {
    console.warn(`[${fuente.marca}] marca no encontrada en BD, omitida.`);
    return;
  }
  console.log(`\n== ${marca.nombre}`);
  // 1. Excel
  if (fs.existsSync(fuente.excel)) {
    const buffer = fs.readFileSync(fuente.excel);
    const r = await procesarCarga({
      marcaId: marca.id,
      anio: ANIO,
      usuarioId: adminId,
      files: [{ originalname: path.basename(fuente.excel), buffer, size: buffer.length }],
    });
    console.log(`  Excel: ${r.mesActual} ${ANIO}, ${r.filasInsertadas} filas en ${r.duracionMs} ms`, r.advertencias.length ? r.advertencias : '');
  } else {
    console.warn(`  Excel no encontrado: ${fuente.excel}`);
  }
  const estado = fuente.estado();
  if (!estado) {
    console.warn('  Sin dashboard.json');
    return;
  }
  const periodo = (await prisma.metricaCuenta.findFirst({ where: { cuenta: { marcaId: marca.id } }, orderBy: { periodo: 'desc' } }))?.periodo ?? null;
  // 2. Ubicaciones
  const locations = estado.locations ?? {};
  for (const [tipo, filas] of [
    [TipoUbicacion.PAIS, locations.countries ?? []],
    [TipoUbicacion.CIUDAD, locations.cities ?? []],
  ]) {
    await prisma.ubicacion.deleteMany({ where: { marcaId: marca.id, tipo } });
    if (filas.length)
      await prisma.ubicacion.createMany({ data: filas.map((f, orden) => ({ marcaId: marca.id, tipo, nombre: f.location, porcentaje: f.percentage, orden })) });
  }
  console.log(`  Ubicaciones: ${locations.countries?.length ?? 0} países, ${locations.cities?.length ?? 0} ciudades`);
  // 3. Notas y textos
  let notas = 0;
  for (const [clave, texto] of Object.entries(estado.notes ?? {})) {
    if (!texto?.trim()) continue;
    await prisma.nota.upsert({ where: { marcaId_clave: { marcaId: marca.id, clave } }, update: { texto }, create: { marcaId: marca.id, clave, texto } });
    notas += 1;
  }
  const copy = estado.copy ?? {};
  for (const [k, clave] of [
    ['conclusions', ClaveTextoEditorial.CONCLUSIONES],
    ['recommendations', ClaveTextoEditorial.RECOMENDACIONES],
  ]) {
    if (!copy[k]?.trim()) continue;
    await prisma.textoEditorial.upsert({
      where: { marcaId_clave: { marcaId: marca.id, clave } },
      update: { texto: copy[k] },
      create: { marcaId: marca.id, clave, texto: copy[k] },
    });
  }
  console.log(`  Notas: ${notas}, textos: ${Object.values(copy).filter(Boolean).length}`);
  // 4. Contenidos manuales con imagen
  const contenidos = estado.content ?? [];
  await prisma.contenidoManual.updateMany({ where: { marcaId: marca.id }, data: { deletedAt: new Date() } });
  let conImagen = 0;
  for (const c of contenidos) {
    const tipo = c.type === 'story' ? TipoContenidoManual.HISTORIA : TipoContenidoManual.PUBLICACION;
    let imagenUrl = null;
    const ruta = c.image ? path.join(fuente.frontend, c.image) : null;
    if (ruta && fs.existsSync(ruta)) {
      imagenUrl = await guardarImagen(marca.clave, tipo, fs.readFileSync(ruta));
      conImagen += 1;
    }
    await prisma.contenidoManual.create({ data: { marcaId: marca.id, tipo, fecha: new Date(c.date), imagenUrl, metricas: c.metrics ?? {} } });
  }
  console.log(`  Contenidos: ${contenidos.length} (${conImagen} con imagen)`);
  // 5. Comunicaciones (MIMESA)
  const comunicaciones = estado.communications ?? [];
  if (comunicaciones.length) {
    await prisma.comunicacion.deleteMany({ where: { marcaId: marca.id } });
    await prisma.comunicacion.createMany({ data: comunicaciones.map((c, orden) => ({ marcaId: marca.id, tema: c.topic, formato: c.format, periodo, orden })) });
    console.log(`  Comunicaciones: ${comunicaciones.length}`);
  }
}
async function main() {
  fs.mkdirSync(config.uploadsDir, { recursive: true });
  fs.mkdirSync(config.reportsDir, { recursive: true });
  const admin = await prisma.usuario.findFirst({ where: { rol: 'ADMINISTRADOR' } });
  if (!admin) throw new Error('Ejecuta primero el seed: no existe un administrador.');
  console.log(`Raíz del legado: ${RAIZ} | año: ${ANIO}`);
  for (const fuente of FUENTES) await migrarMarca(fuente, admin.id);
}
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
