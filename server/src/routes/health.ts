import { Router } from 'express';
import { config } from '../config';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    ok: true,
    data: {
      service: 'netvault-server',
      version: '1.0.0',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      anthropicConfigured: !!config.anthropic.apiKey,
      model: config.anthropic.model,
    },
  });
});

export default router;
