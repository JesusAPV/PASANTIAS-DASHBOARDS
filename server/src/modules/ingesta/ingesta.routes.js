import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { asyncHandler, unprocessable } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import { authenticate, requireAdmin, requireBrandAccess } from '../auth/auth.middleware.js';
import { HOJAS_OPCIONALES, HOJAS_REQUERIDAS } from './parser.js';
import { listarCargas, procesarCarga } from './ingesta.service.js';
const router = Router();
router.use(authenticate);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (/\.(xlsx|xls|csv)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Solo se aceptan archivos .xlsx o .csv'));
  },
});
const bodySchema = z.object({ anio: z.coerce.number().int().min(2020).max(2100) });
/** Plantilla: hojas/archivos esperados para preparar los CSV. */
router.get('/plantilla', (_req, res) => {
  res.json({
    ok: true,
    hojasRequeridas: HOJAS_REQUERIDAS,
    hojasOpcionales: HOJAS_OPCIONALES,
    instrucciones: 'Sube un .xlsx con todas las hojas, o un .csv por hoja nombrado exactamente como la hoja (ej. "Seguidores.csv").',
  });
});
router.get(
  '/:marcaId',
  requireBrandAccess(),
  asyncHandler(async (req, res) => {
    res.json({ ok: true, cargas: await listarCargas(req.params.marcaId) });
  }),
);
router.post(
  '/:marcaId',
  requireAdmin,
  upload.array('archivos', 20),
  asyncHandler(async (req, res) => {
    const files = req.files ?? [];
    if (!files.length) throw unprocessable('No se recibió ningún archivo.');
    const { anio } = bodySchema.parse(req.body);
    const resultado = await procesarCarga({ marcaId: req.params.marcaId, anio, usuarioId: req.user.id, files });
    await audit(req, 'carga.procesar', {
      entidad: 'carga_archivo',
      entidadId: resultado.cargaId,
      detalles: { marcaId: req.params.marcaId, periodo: resultado.periodo, filas: resultado.filasInsertadas, duracionMs: resultado.duracionMs },
    });
    res.status(201).json({ ok: true, ...resultado });
  }),
);
export default router;
