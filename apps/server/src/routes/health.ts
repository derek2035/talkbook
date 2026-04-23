import type { Request, Response } from 'express';

import { env } from '../config/env.js';

export function healthHandler(_req: Request, res: Response) {
  res.json({ status: 'ok', service: 'talkbook-server', nodeEnv: env.nodeEnv });
}
