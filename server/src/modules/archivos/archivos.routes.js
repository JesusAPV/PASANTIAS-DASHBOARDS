import path from 'node:path';
import express, { Router } from 'express';
import { config } from '../../config.js';
import { asyncHandler, forbidden, notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../auth/auth.middleware.js';
import { canAccessBrand } from '../auth/auth.service.js';
const router = Router();
/** Imágenes subidas por el administrador: requieren sesión y acceso a la marca. */
router.use(
  '/:marcaClave',
  authenticate,
  asyncHandler(async (req, _res, next) => {
    const marca = await prisma.marca.findUnique({ where: { clave: String(req.params.marcaClave) } });
    if (!marca) throw notFound();
    if (!(await canAccessBrand(req.user, marca.id))) throw forbidden('No tienes acceso a esta marca.');
    next();
  }),
  (req, res, next) => {
    express.static(path.join(config.uploadsDir, String(req.params.marcaClave)), { fallthrough: false, maxAge: '1h', index: false })(req, res, next);
  },
);
export default router;
