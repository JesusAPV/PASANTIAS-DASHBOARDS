import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { asyncHandler, conflict, notFound, unprocessable } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import { prisma, Rol } from '../../lib/prisma.js';
import { authenticate, requireAdmin } from '../auth/auth.middleware.js';
const router = Router();
router.use(authenticate, requireAdmin);
const select = {
  id: true,
  username: true,
  nombre: true,
  rol: true,
  clienteId: true,
  activo: true,
  ultimoAcceso: true,
  createdAt: true,
  cliente: { select: { nombre: true } },
  marcas: { select: { marcaId: true } },
};
const baseSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9._-]{3,40}$/i, 'Usuario inválido (3-40 caracteres alfanuméricos).'),
  nombre: z.string().trim().min(2).max(120),
  rol: z.nativeEnum(Rol),
  clienteId: z.string().uuid().nullable().optional(),
  marcaIds: z.array(z.string().uuid()).optional(),
  activo: z.boolean().optional(),
});
const passwordSchema = z.string().min(10, 'La contraseña debe tener al menos 10 caracteres.').max(200);
async function validarCliente(data) {
  if (data.rol === Rol.CLIENTE) {
    if (!data.clienteId) throw unprocessable('Un usuario Cliente debe pertenecer a un cliente.');
    const marcas = await prisma.marca.findMany({ where: { clienteId: data.clienteId, deletedAt: null }, select: { id: true } });
    const permitidas = new Set(marcas.map((m) => m.id));
    const marcaIds = (data.marcaIds?.length ? data.marcaIds : [...permitidas]).filter((id) => permitidas.has(id));
    if (!marcaIds.length) throw unprocessable('Debes asignar al menos una marca del cliente.');
    return marcaIds;
  }
  return [];
}
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const usuarios = await prisma.usuario.findMany({ where: { deletedAt: null }, select, orderBy: [{ rol: 'asc' }, { username: 'asc' }] });
    res.json({ ok: true, usuarios: usuarios.map((u) => ({ ...u, marcaIds: u.marcas.map((m) => m.marcaId), marcas: undefined })) });
  }),
);
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = baseSchema.extend({ password: passwordSchema }).parse(req.body);
    if (await prisma.usuario.findUnique({ where: { username: data.username } })) throw conflict('Ese nombre de usuario ya existe.');
    const marcaIds = await validarCliente(data);
    const usuario = await prisma.usuario.create({
      data: {
        username: data.username,
        nombre: data.nombre,
        rol: data.rol,
        passwordHash: await bcrypt.hash(data.password, 10),
        clienteId: data.rol === Rol.CLIENTE ? data.clienteId : null,
        marcas: { create: marcaIds.map((marcaId) => ({ marcaId })) },
      },
      select,
    });
    await audit(req, 'usuario.crear', { entidad: 'usuario', entidadId: usuario.id, detalles: { rol: usuario.rol } });
    res.status(201).json({ ok: true, usuario });
  }),
);
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const existing = await prisma.usuario.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw notFound('El usuario no existe.');
    const data = baseSchema.partial().parse(req.body);
    const merged = { ...existing, ...data, rol: data.rol ?? existing.rol, clienteId: data.clienteId === undefined ? existing.clienteId : data.clienteId };
    if (data.username && data.username !== existing.username && (await prisma.usuario.findUnique({ where: { username: data.username } })))
      throw conflict('Ese nombre de usuario ya existe.');
    if (existing.id === req.user.id && ((data.rol && data.rol !== Rol.ADMINISTRADOR) || data.activo === false))
      throw unprocessable('No puedes quitarte el rol de administrador ni desactivarte.');
    const marcaIds = await validarCliente(merged);
    const usuario = await prisma.usuario.update({
      where: { id },
      data: {
        username: data.username,
        nombre: data.nombre,
        rol: data.rol,
        activo: data.activo,
        clienteId: merged.rol === Rol.CLIENTE ? merged.clienteId : null,
        marcas: { deleteMany: {}, create: marcaIds.map((marcaId) => ({ marcaId })) },
      },
      select,
    });
    if (data.activo === false) await prisma.sesion.updateMany({ where: { usuarioId: id, revocadaEn: null }, data: { revocadaEn: new Date() } });
    await audit(req, 'usuario.actualizar', { entidad: 'usuario', entidadId: id });
    res.json({ ok: true, usuario });
  }),
);
router.put(
  '/:id/password',
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const { password } = z.object({ password: passwordSchema }).parse(req.body);
    const result = await prisma.usuario.updateMany({ where: { id, deletedAt: null }, data: { passwordHash: await bcrypt.hash(password, 10) } });
    if (!result.count) throw notFound('El usuario no existe.');
    await prisma.sesion.updateMany({ where: { usuarioId: id, revocadaEn: null, NOT: { id: req.user.sesionId } }, data: { revocadaEn: new Date() } });
    await audit(req, 'usuario.password', { entidad: 'usuario', entidadId: id });
    res.json({ ok: true });
  }),
);
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    if (id === req.user.id) throw unprocessable('No puedes eliminar tu propio usuario.');
    const result = await prisma.usuario.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), activo: false } });
    if (!result.count) throw notFound('El usuario no existe.');
    await prisma.sesion.updateMany({ where: { usuarioId: id, revocadaEn: null }, data: { revocadaEn: new Date() } });
    await audit(req, 'usuario.eliminar', { entidad: 'usuario', entidadId: id });
    res.json({ ok: true });
  }),
);
/** Catálogo de clientes y marcas para los formularios de usuario. */
router.get(
  '/catalogo',
  asyncHandler(async (_req, res) => {
    const clientes = await prisma.cliente.findMany({
      where: { deletedAt: null },
      include: { marcas: { where: { deletedAt: null }, select: { id: true, clave: true, nombre: true }, orderBy: { orden: 'asc' } } },
      orderBy: { nombre: 'asc' },
    });
    res.json({ ok: true, clientes, roles: Object.values(Rol) });
  }),
);
export default router;
