import express from 'express';
import cors from 'cors';
import { config } from './config';
import { requestLogger } from './middleware/logger';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import analysisRouter from './routes/analysis';

const app = express();

// ─── Middlewares ──────────────────────────────────────────────────────────────
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(requestLogger);

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/analysis', analysisRouter);

// Catch-all 404
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Ruta no encontrada', code: 'NOT_FOUND' });
});

// Error handler global
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[unhandled]', err);
  res.status(500).json({ ok: false, error: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
});

// ─── Arranque ─────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`\n🚀 NetVault Server v1.0.0`);
  console.log(`   Puerto  : ${config.port}`);
  console.log(`   Modo    : ${config.isDev ? 'desarrollo' : 'producción'}`);
  console.log(`   Claude  : ${config.anthropic.apiKey ? '✓ configurado' : '⚠ mock (sin API key)'}`);
  console.log(`   Usuarios: ${config.demoUsers.map((u) => u.username).join(', ')}`);
  console.log(`\n   GET  http://localhost:${config.port}/health`);
  console.log(`   POST http://localhost:${config.port}/auth/login`);
  console.log(`   POST http://localhost:${config.port}/analysis/run\n`);
});

export default app;
