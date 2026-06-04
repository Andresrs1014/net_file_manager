import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { runAnalysis, runAnalysisMock } from '../services/analysis';
import { loadRubricConfig, loadRubricMarkdown } from '../services/rubric';
import { config } from '../config';
import { AnalysisRequest, ProcedureArea } from '../types';

const router = Router();

const AnalysisRequestSchema = z.object({
  procedureCode: z.string().min(1).max(50),
  area: z.enum(['T&C', 'P&C', 'Transportes'] as [ProcedureArea, ...ProcedureArea[]]),
  textContent: z.string().min(10).max(50000),
  existingFlowchartMmd: z.string().optional(),
});

/**
 * POST /analysis/run
 * Analiza un procedimiento y devuelve el paquete completo.
 * Requiere autenticación; analistas y aprobadores pueden ejecutar.
 */
router.post(
  '/run',
  requireAuth,
  requireRole('analista', 'aprobador_maximo'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = AnalysisRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: 'Cuerpo inválido',
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
      return;
    }

    const analysisReq: AnalysisRequest = parsed.data;

    try {
      const pkg = config.anthropic.apiKey
        ? await runAnalysis(analysisReq)
        : runAnalysisMock(analysisReq);

      res.json({ ok: true, data: pkg });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error interno';
      console.error('[analysis/run]', message);
      res.status(500).json({ ok: false, error: message, code: 'ANALYSIS_FAILED' });
    }
  },
);

/**
 * GET /analysis/rubric
 * Devuelve la rúbrica activa (JSON + markdown) para la UI de NetVault.
 */
router.get('/rubric', (_req: Request, res: Response): void => {
  try {
    const json = loadRubricConfig();
    const markdown = loadRubricMarkdown();
    res.json({ ok: true, data: { json, markdown } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error cargando rúbrica';
    res.status(500).json({ ok: false, error: message });
  }
});

/**
 * GET /analysis/status
 * Devuelve si el motor está listo (API key configurada).
 */
router.get('/status', requireAuth, (_req: Request, res: Response): void => {
  res.json({
    ok: true,
    data: {
      ready: !!config.anthropic.apiKey,
      mode: config.anthropic.apiKey ? 'claude' : 'mock',
      model: config.anthropic.model,
    },
  });
});

export default router;
