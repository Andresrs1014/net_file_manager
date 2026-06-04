import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { requireAuth } from '../middleware/auth';
import { JwtPayload } from '../types';

const router = Router();

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

/**
 * POST /auth/login
 * Autentica con usuario/contraseña (MVP demo).
 * En producción: reemplazar por validación contra SSO/LDAP de la intranet.
 */
router.post('/login', (req: Request, res: Response): void => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'Cuerpo inválido', code: 'VALIDATION_ERROR' });
    return;
  }

  const { username, password } = parsed.data;
  const user = config.demoUsers.find(
    (u) => u.username === username && u.password === password,
  );

  if (!user) {
    res.status(401).json({ ok: false, error: 'Credenciales incorrectas', code: 'INVALID_CREDENTIALS' });
    return;
  }

  const payload: JwtPayload = { username: user.username, role: user.role };
  const token = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });

  res.json({
    ok: true,
    data: {
      token,
      user: { username: user.username, role: user.role },
      expiresIn: config.jwt.expiresIn,
    },
  });
});

/**
 * GET /auth/me
 * Devuelve el usuario del token activo.
 */
router.get('/me', requireAuth, (req: Request, res: Response): void => {
  res.json({ ok: true, data: req.user });
});

/**
 * POST /auth/refresh
 * Renueva el token si aún es válido.
 */
router.post('/refresh', requireAuth, (req: Request, res: Response): void => {
  const { username, role } = req.user!;
  const token = jwt.sign({ username, role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
  res.json({ ok: true, data: { token, expiresIn: config.jwt.expiresIn } });
});

export default router;
