import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload, UserRole } from '../types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ ok: false, error: 'Token requerido', code: 'UNAUTHORIZED' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'Token inválido o expirado', code: 'TOKEN_INVALID' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ ok: false, error: 'No autenticado', code: 'UNAUTHORIZED' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        ok: false,
        error: `Rol insuficiente. Se requiere: ${roles.join(' o ')}`,
        code: 'FORBIDDEN',
      });
      return;
    }
    next();
  };
}
