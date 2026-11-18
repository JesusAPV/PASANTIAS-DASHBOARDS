import { Router } from 'express';
import { asyncHandler, notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { authenticate, requireBrandAccess } from '../auth/auth.middleware.js';
import { accessibleBrands } from '../auth/auth.service.js';
const router = Router();
router.use(authenticate);
/** Marcas visibles para el usuario, agrupadas por cliente. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const marcas = await accessibleBrands(req.user);
    const clientes = new Map();
    for (const marca of marcas) {
      const grupo = clientes.get(marca.clienteId) ?? { id: marca.cliente.id, clave: marca.cliente.clave, nombre: marca.cliente.nombre, marcas: [] };
      grupo.marcas.push(marca);
      clientes.set(marca.clienteId, grupo);
    }
    res.json({ ok: true, marcas, clientes: [...clientes.values()] });
  }),
);
router.get(
  '/:marcaId',
  requireBrandAccess(),
  asyncHandler(async (req, res) => {
    const marca = await prisma.marca.findFirst({
      where: { id: req.params.marcaId, deletedAt: null },
      include: { cliente: true, cuentas: true },
    });
    if (!marca) throw notFound('La marca no existe.');
    res.json({ ok: true, marca });
  }),
);
export default router;
