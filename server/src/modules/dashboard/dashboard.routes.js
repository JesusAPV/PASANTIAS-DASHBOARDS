import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../../config.js';
import { asyncHandler } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import { ClaveTextoEditorial, TipoContenidoManual, TipoUbicacion } from '../../lib/prisma.js';
import { authenticate, requireBrandAccess, requireRole } from '../auth/auth.middleware.js';
import { Rol } from '../../lib/prisma.js';
import { obtenerDashboard, obtenerRevision } from './dashboard.service.js';
import * as editorial from './editorial.service.js';
const router = Router();
router.use(authenticate);
/** Roles autorizados a editar contenido editorial del dashboard. */
const requireEditor = requireRole(Rol.ADMINISTRADOR);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxImageBytes, files: 1 } });
const ubicacionesSchema = z.object({
  tipo: z.nativeEnum(TipoUbicacion),
  filas: z.array(z.object({ nombre: z.string().trim().min(1).max(80), porcentaje: z.coerce.number().min(0).max(100) })).max(20),
});
const textoSchema = z.object({ texto: z.string().max(5000) });
const claveNotaSchema = z.string().regex(/^[a-z0-9._-]{2,60}$/i);
const comunicacionSchema = z.object({
  tema: z.string().trim().min(1).max(160),
  formato: z.string().trim().min(1).max(500),
  periodo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});
const contenidoSchema = z.object({
  tipo: z.nativeEnum(TipoContenidoManual),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  metricas: z.preprocess((v) => (typeof v === 'string' ? JSON.parse(v) : v), z.record(z.string(), z.unknown())),
});
const brand = requireBrandAccess();
router.get(
  '/:marcaId',
  brand,
  asyncHandler(async (req, res) => {
    const periodo = typeof req.query.periodo === 'string' ? req.query.periodo : undefined;
    res.json({ ok: true, ...(await obtenerDashboard(req.params.marcaId, periodo)) });
  }),
);
router.get(
  '/:marcaId/revision',
  brand,
  asyncHandler(async (req, res) => {
    res.json({ ok: true, revision: await obtenerRevision(req.params.marcaId) });
  }),
);
router.put(
  '/:marcaId/ubicaciones',
  brand,
  requireEditor,
  asyncHandler(async (req, res) => {
    const { tipo, filas } = ubicacionesSchema.parse(req.body);
    await editorial.guardarUbicaciones(req.params.marcaId, tipo, filas);
    await audit(req, 'ubicaciones.guardar', { entidad: 'marca', entidadId: req.params.marcaId, detalles: { tipo, filas: filas.length } });
    res.json({ ok: true });
  }),
);
router.put(
  '/:marcaId/notas/:clave',
  brand,
  requireEditor,
  asyncHandler(async (req, res) => {
    const clave = claveNotaSchema.parse(req.params.clave);
    const { texto } = textoSchema.parse(req.body);
    await editorial.guardarNota(req.params.marcaId, clave, texto);
    await audit(req, 'nota.guardar', { entidad: 'marca', entidadId: req.params.marcaId, detalles: { clave } });
    res.json({ ok: true });
  }),
);
router.put(
  '/:marcaId/textos/:clave',
  brand,
  requireEditor,
  asyncHandler(async (req, res) => {
    const clave = z.nativeEnum(ClaveTextoEditorial).parse(String(req.params.clave).toUpperCase());
    const { texto } = textoSchema.parse(req.body);
    await editorial.guardarTexto(req.params.marcaId, clave, texto);
    await audit(req, 'texto.guardar', { entidad: 'marca', entidadId: req.params.marcaId, detalles: { clave } });
    res.json({ ok: true });
  }),
);
router.post(
  '/:marcaId/comunicaciones',
  brand,
  requireEditor,
  asyncHandler(async (req, res) => {
    const item = await editorial.crearComunicacion(req.params.marcaId, comunicacionSchema.parse(req.body));
    await audit(req, 'comunicacion.crear', { entidad: 'comunicacion', entidadId: item.id });
    res.status(201).json({ ok: true, item });
  }),
);
router.put(
  '/:marcaId/comunicaciones/:id',
  brand,
  requireEditor,
  asyncHandler(async (req, res) => {
    const item = await editorial.actualizarComunicacion(req.params.marcaId, req.params.id, comunicacionSchema.partial().parse(req.body));
    await audit(req, 'comunicacion.actualizar', { entidad: 'comunicacion', entidadId: item.id });
    res.json({ ok: true, item });
  }),
);
router.delete(
  '/:marcaId/comunicaciones/:id',
  brand,
  requireEditor,
  asyncHandler(async (req, res) => {
    await editorial.eliminarComunicacion(req.params.marcaId, req.params.id);
    await audit(req, 'comunicacion.eliminar', { entidad: 'comunicacion', entidadId: req.params.id });
    res.json({ ok: true });
  }),
);
router.post(
  '/:marcaId/contenidos',
  brand,
  requireEditor,
  upload.single('imagen'),
  asyncHandler(async (req, res) => {
    const data = contenidoSchema.parse(req.body);
    const item = await editorial.crearContenido(req.params.marcaId, data, req.file?.buffer);
    await audit(req, 'contenido.crear', { entidad: 'contenido_manual', entidadId: item.id, detalles: { tipo: item.tipo } });
    res.status(201).json({ ok: true, item });
  }),
);
router.put(
  '/:marcaId/contenidos/:id',
  brand,
  requireEditor,
  upload.single('imagen'),
  asyncHandler(async (req, res) => {
    const data = contenidoSchema.omit({ tipo: true }).partial().parse(req.body);
    const item = await editorial.actualizarContenido(req.params.marcaId, req.params.id, data, req.file?.buffer);
    await audit(req, 'contenido.actualizar', { entidad: 'contenido_manual', entidadId: item.id });
    res.json({ ok: true, item });
  }),
);
router.delete(
  '/:marcaId/contenidos/:id',
  brand,
  requireEditor,
  asyncHandler(async (req, res) => {
    await editorial.eliminarContenido(req.params.marcaId, req.params.id);
    await audit(req, 'contenido.eliminar', { entidad: 'contenido_manual', entidadId: req.params.id });
    res.json({ ok: true });
  }),
);
export default router;
