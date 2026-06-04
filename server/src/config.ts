import dotenv from 'dotenv';
import path from 'path';
import { UserRole } from './types';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Variable de entorno requerida: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

// ─── Usuarios demo ────────────────────────────────────────────────────────────
export interface DemoUser {
  username: string;
  password: string;
  role: UserRole;
}

function parseDemoUsers(): DemoUser[] {
  const raw = optional('DEMO_USERS', 'admin:admin123:aprobador_maximo');
  return raw.split(',').map((entry) => {
    const [username, password, role] = entry.trim().split(':');
    return { username, password, role: role as UserRole };
  });
}

export const config = {
  port: parseInt(optional('PORT', '3847'), 10),
  jwt: {
    secret: optional('JWT_SECRET', 'dev-secret-cambiar-en-produccion'),
    expiresIn: optional('JWT_EXPIRES_IN', '8h'),
  },
  anthropic: {
    apiKey: optional('ANTHROPIC_API_KEY', ''),
    model: optional('CLAUDE_MODEL', 'claude-opus-4-5-20251001'),
  },
  corsOrigins: optional('CORS_ORIGINS', 'app://.,http://localhost:5173').split(',').map((s) => s.trim()),
  intranet: {
    url: optional('INTRANET_URL', ''),
    hmacSecret: optional('INTRANET_HMAC_SECRET', ''),
  },
  demoUsers: parseDemoUsers(),
  isDev: optional('NODE_ENV', 'development') === 'development',
} as const;
