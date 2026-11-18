import { config } from '../../config.js';
import { Rol } from '../../lib/prisma.js';
import { asyncHandler, forbidden, unauthorized } from '../../lib/errors.js';
import { canAccessBrand, resolveSession } from './auth.service.js';
function extractToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const cookie = req.cookies?.[config.cookieName];
  return typeof cookie === 'string' && cookie ? cookie : null;
}
/** Autentica la petición. El sondeo automático debe enviar `X-Passive: 1`. */
export const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw unauthorized();
  const passive = req.headers['x-passive'] === '1';
  const { usuario, sesion, expiraEn } = await resolveSession(token, !passive);
  req.user = {
    id: usuario.id,
    username: usuario.username,
    nombre: usuario.nombre,
    rol: usuario.rol,
    clienteId: usuario.clienteId,
    sesionId: sesion.id,
    expiraEn,
  };
  res.setHeader('X-Session-Expires', expiraEn.toISOString());
  next();
});
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.rol)) return next(forbidden());
    next();
  };
export const requireAdmin = requireRole(Rol.ADMINISTRADOR);
export const requireStaff = requireRole(Rol.ADMINISTRADOR, Rol.GERENTE);
/** Verifica que el usuario pueda ver la marca indicada en `req.params[param]`. */
export const requireBrandAccess = (param = 'marcaId') =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user) throw unauthorized();
    const marcaId = String(req.params[param] ?? '');
    if (!(await canAccessBrand(req.user, marcaId))) throw forbidden('No tienes acceso a esta marca.');
    next();
  });
