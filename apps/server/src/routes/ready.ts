import type { Request, Response } from 'express';

import { env } from '../config/env.js';
import { getAiMode } from '../lib/ai-service.js';
import { getAsrMode } from '../lib/asr-service.js';
import { database } from '../lib/database.js';

export function readyHandler(_req: Request, res: Response) {
  const row = database.prepare('SELECT 1 AS ok').get() as { ok: number } | undefined;

  res.json({
    status: row?.ok === 1 ? 'ok' : 'degraded',
    service: 'talkbook-server',
    nodeEnv: env.nodeEnv,
    mockLoginEnabled: env.allowMockWeChatLogin,
    aiProvider: env.aiProvider,
    aiMode: getAiMode(),
    asrProvider: env.asrProvider,
    asrMode: getAsrMode()
  });
}
