import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import { prisma, Rol } from '../../lib/prisma.js';
import { unauthorized } from '../../lib/errors.js';
const idleMs = () => config.sessionIdleMinutes * 60 * 1000;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
export async function login(username, password, meta) {
  const usuario = await prisma.usuario.findFirst({ where: { username, activo: true, deletedAt: null } });
  const valid = usuario ? await bcrypt.compare(password, usuario.passwordHash) : false;
  if (!usuario || !valid) throw unauthorized('Usuario o contraseña incorrectos.', 'invalid_credentials');
  const jti = crypto.randomBytes(32).toString('hex');
  const expiraEn = new Date(Date.now() + idleMs());
  const sesion = await prisma.sesion.create({
    data: { usuarioId: usuario.id, tokenHash: hashToken(jti), expiraEn, ip: meta.ip ?? null, userAgent: meta.userAgent ?? null },
  });
  await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcceso: new Date() } });
  const payload = { sub: usuario.id, sid: sesion.id, jti };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '30d' });
  return { token, usuario, sesion };
}
/**
 * Valida el token y la sesión. Si `touch` es true renueva el vencimiento por
 * inactividad (solo actividad humana; el sondeo automático envía touch=false).
 */
export async function resolveSession(token, touch) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw unauthorized('La sesión no es válida.', 'invalid_token');
  }
  const sesion = await prisma.sesion.findUnique({ where: { id: payload.sid }, include: { usuario: true } });
  if (!sesion || sesion.tokenHash !== hashToken(payload.jti) || sesion.revocadaEn) {
    throw unauthorized('La sesión dejó de estar activa.', 'session_revoked');
  }
  if (sesion.expiraEn.getTime() < Date.now()) {
    throw unauthorized('La sesión expiró por inactividad.', 'session_expired');
  }
  if (!sesion.usuario.activo || sesion.usuario.deletedAt) {
    throw unauthorized('El usuario está deshabilitado.', 'user_disabled');
  }
  let expiraEn = sesion.expiraEn;
  if (touch) {
    expiraEn = new Date(Date.now() + idleMs());
    await prisma.sesion.update({ where: { id: sesion.id }, data: { ultimaActividad: new Date(), expiraEn } });
  }
  return { sesion, usuario: sesion.usuario, expiraEn };
}
export async function logout(sesionId) {
  await prisma.sesion.updateMany({ where: { id: sesionId, revocadaEn: null }, data: { revocadaEn: new Date() } });
}
/** Marcas que el usuario puede ver según su rol. */
export async function accessibleBrands(user) {
  if (user.rol === Rol.CLIENTE) {
    return prisma.marca.findMany({
      where: { deletedAt: null, usuariosMarcas: { some: { usuarioId: user.id } } },
      include: { cliente: true },
      orderBy: [{ cliente: { nombre: 'asc' } }, { orden: 'asc' }],
    });
  }
  return prisma.marca.findMany({ where: { deletedAt: null }, include: { cliente: true }, orderBy: [{ cliente: { nombre: 'asc' } }, { orden: 'asc' }] });
}
export async function canAccessBrand(user, marcaId) {
  if (user.rol !== Rol.CLIENTE) return true;
  const access = await prisma.usuarioMarca.findUnique({ where: { usuarioId_marcaId: { usuarioId: user.id, marcaId } } });
  return Boolean(access);
}
export function publicUser(usuario, expiraEn) {
  return {
    id: usuario.id,
    username: usuario.username,
    nombre: usuario.nombre,
    rol: usuario.rol,
    clienteId: usuario.clienteId,
    expiraEn: expiraEn.toISOString(),
    avisoMinutos: config.sessionWarningMinutes,
  };
}
