import { Router } from 'express';
import { z } from 'zod';
import { config } from '../../config.js';
import { asyncHandler } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import { authenticate } from './auth.middleware.js';
import { accessibleBrands, login, logout, publicUser } from './auth.service.js';
const router = Router();
const loginSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
});
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: config.env === 'production',
  path: '/',
};
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const { token, usuario, sesion } = await login(username, password, { ip: req.ip, userAgent: req.headers['user-agent'] });
    req.user = {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      rol: usuario.rol,
      clienteId: usuario.clienteId,
      sesionId: sesion.id,
      expiraEn: sesion.expiraEn,
    };
    await audit(req, 'auth.login');
    res.cookie(config.cookieName, token, cookieOptions);
    res.json({ ok: true, token, usuario: publicUser(usuario, sesion.expiraEn), marcas: await accessibleBrands(usuario) });
  }),
);
router.get(
  '/session',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = req.user;
    res.json({ ok: true, usuario: publicUser(user, user.expiraEn), marcas: await accessibleBrands(user) });
  }),
);
router.post('/activity', authenticate, (req, res) => {
  res.json({ ok: true, expiraEn: req.user.expiraEn.toISOString() });
});
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    await audit(req, 'auth.logout');
    await logout(req.user.sesionId);
    res.clearCookie(config.cookieName, cookieOptions);
    res.json({ ok: true });
  }),
);
export default router;
