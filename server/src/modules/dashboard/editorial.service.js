import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { config } from '../../config.js';
import { prisma, TipoContenidoManual } from '../../lib/prisma.js';
import { notFound, unprocessable } from '../../lib/errors.js';
import { marcaOrThrow } from './dashboard.service.js';
export async function guardarUbicaciones(marcaId, tipo, filas) {
  await marcaOrThrow(marcaId);
  await prisma.$transaction(async (tx) => {
    await tx.ubicacion.deleteMany({ where: { marcaId, tipo } });
    if (filas.length) {
      await tx.ubicacion.createMany({ data: filas.map((f, orden) => ({ marcaId, tipo, nombre: f.nombre, porcentaje: f.porcentaje, orden })) });
    }
  });
}
export async function guardarNota(marcaId, clave, texto) {
  await marcaOrThrow(marcaId);
  if (!texto.trim()) {
    await prisma.nota.deleteMany({ where: { marcaId, clave } });
    return;
  }
  await prisma.nota.upsert({ where: { marcaId_clave: { marcaId, clave } }, update: { texto }, create: { marcaId, clave, texto } });
}
export async function guardarTexto(marcaId, clave, texto) {
  await marcaOrThrow(marcaId);
  await prisma.textoEditorial.upsert({ where: { marcaId_clave: { marcaId, clave } }, update: { texto }, create: { marcaId, clave, texto } });
}
export async function crearComunicacion(marcaId, data) {
  await marcaOrThrow(marcaId);
  const ultimo = await prisma.comunicacion.aggregate({ where: { marcaId }, _max: { orden: true } });
  return prisma.comunicacion.create({
    data: { marcaId, tema: data.tema, formato: data.formato, periodo: data.periodo ? new Date(data.periodo) : null, orden: (ultimo._max.orden ?? -1) + 1 },
  });
}
export async function actualizarComunicacion(marcaId, id, data) {
  const existing = await prisma.comunicacion.findFirst({ where: { id, marcaId, deletedAt: null } });
  if (!existing) throw notFound('La comunicación no existe.');
  return prisma.comunicacion.update({
    where: { id },
    data: { tema: data.tema, formato: data.formato, periodo: data.periodo === undefined ? undefined : data.periodo ? new Date(data.periodo) : null },
  });
}
export async function eliminarComunicacion(marcaId, id) {
  const result = await prisma.comunicacion.updateMany({ where: { id, marcaId, deletedAt: null }, data: { deletedAt: new Date() } });
  if (!result.count) throw notFound('La comunicación no existe.');
}
// ---------------------------------------------------------------------------
// Contenidos manuales (publicaciones/historias destacadas con imagen)
// ---------------------------------------------------------------------------
const METRICAS_PERMITIDAS = {
  PUBLICACION: ['views', 'likes', 'comments', 'shares', 'reposts', 'saves'],
  HISTORIA: ['reach', 'impressions', 'responses'],
};
export function normalizarMetricas(tipo, metricas) {
  const permitidas = METRICAS_PERMITIDAS[tipo];
  const result = {};
  for (const key of permitidas) {
    const value = Number(metricas[key] ?? 0);
    if (!Number.isFinite(value) || value < 0) throw unprocessable(`La métrica "${key}" debe ser un número mayor o igual a cero.`);
    result[key] = Math.round(value);
  }
  return result;
}
/** Valida, redimensiona y guarda la imagen; devuelve la URL pública relativa. */
export async function guardarImagen(marcaClave, tipo, buffer) {
  if (buffer.length > config.maxImageBytes) throw unprocessable(`La imagen supera el tamaño máximo permitido.`);
  const image = sharp(buffer, { failOn: 'error' });
  const meta = await image.metadata().catch(() => {
    throw unprocessable('El archivo no es una imagen válida.');
  });
  if (!meta.format || !['jpeg', 'png', 'webp'].includes(meta.format)) throw unprocessable('Solo se permiten imágenes JPG, PNG o WEBP.');
  const subdir = tipo === TipoContenidoManual.HISTORIA ? 'historias' : 'publicaciones';
  const dir = path.join(config.uploadsDir, marcaClave, subdir);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${crypto.randomBytes(12).toString('hex')}.jpg`;
  await image.rotate().resize({ width: 1080, height: 1920, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(path.join(dir, filename));
  return `/uploads/${marcaClave}/${subdir}/${filename}`;
}
async function borrarImagen(imagenUrl) {
  if (!imagenUrl?.startsWith('/uploads/')) return;
  const relative = imagenUrl.replace('/uploads/', '');
  const absolute = path.resolve(config.uploadsDir, relative);
  if (!absolute.startsWith(config.uploadsDir)) return;
  await fs.rm(absolute, { force: true });
}
export async function crearContenido(marcaId, data, imagen) {
  const marca = await marcaOrThrow(marcaId);
  const imagenUrl = imagen ? await guardarImagen(marca.clave, data.tipo, imagen) : null;
  return prisma.contenidoManual.create({
    data: { marcaId, tipo: data.tipo, fecha: new Date(data.fecha), imagenUrl, metricas: normalizarMetricas(data.tipo, data.metricas) },
  });
}
export async function actualizarContenido(marcaId, id, data, imagen) {
  const existing = await prisma.contenidoManual.findFirst({ where: { id, marcaId, deletedAt: null }, include: { marca: true } });
  if (!existing) throw notFound('El contenido no existe.');
  let imagenUrl = existing.imagenUrl;
  if (imagen) {
    imagenUrl = await guardarImagen(existing.marca.clave, existing.tipo, imagen);
    await borrarImagen(existing.imagenUrl);
  }
  return prisma.contenidoManual.update({
    where: { id },
    data: {
      fecha: data.fecha ? new Date(data.fecha) : undefined,
      imagenUrl,
      metricas: data.metricas ? normalizarMetricas(existing.tipo, data.metricas) : undefined,
    },
  });
}
export async function eliminarContenido(marcaId, id) {
  const existing = await prisma.contenidoManual.findFirst({ where: { id, marcaId, deletedAt: null } });
  if (!existing) throw notFound('El contenido no existe.');
  await prisma.contenidoManual.update({ where: { id }, data: { deletedAt: new Date() } });
  await borrarImagen(existing.imagenUrl);
}
